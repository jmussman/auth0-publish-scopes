// auth0-publish-scopes.test.js
// Copyright © 2024 Joel A Mussman. All rights reserved.
//
// This Action code is released under the MIT license and is free to copy and modify as
// long as the source is attributed.
//
// Note: EVERY test is limited to 20000ms (see the config), because Auth0 constrains actions to 20 seconds.
//

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import 'vitest-mock-commonjs'

import { onExecutePostLogin } from '../src/auth0-publish-scopes'

const mocks = vi.hoisted(() => {

    const gaResponse = {

        data: [
            { name: 'roleA', id: 'R1'},
            { name: 'roleB', id: 'R2'},
            { name: 'roleC', id: 'R3'},
            { name: 'roleD', id: 'R4'},
            { name: 'roleE', id: 'R5'}
        ]
    }

    const gpResponse = {

        'R1': {

            data: [
                { permission_name: 'read:apiA' },
                { permission_name: 'write:apiA' },
                { permission_name: 'update:apiA' },
                { permission_name: 'delete:apiA' }
            ]
        },

        'R2': {

            data: [
                { permission_name: 'read:apiB' },
                { permission_name: 'write:apiB' }
            ]
        },

        'R3': {

            data: [ ]
        }
    }

    const managementClient = {

        roles: {

            getAll: vi.fn(async () => new Promise((resolve) => resolve(gaResponse))),
            getPermissions: vi.fn(async (options) => new Promise((resolve) => resolve(gpResponse[options.id])))
        }
    }

    class ManagementClient {

        constructor(options) {

            this.roles = managementClient.roles
        }
    }

    const mocks = {

        apiMock: {

            idToken: {

                setCustomClaim: vi.fn(() => {})     // Gray-box test: we know the CUT ignores the return value.
            }
        },

        auth0Mock: {
            
            ManagementClient: ManagementClient,
            managementClient: managementClient,
            gaResponse: gaResponse,
            gpResponse: gpResponse
        },

        eventMock: {

            authorization: {

                roles: [ 'roleA', 'roleB', 'roleC' ]
            },

            client: {

                metadata: {

                    roles: 'roleA, roleB, roleC'
                }
            },

            secrets: {

                clientId: 'abc',
                clientSecret: 'xyz',
                debug: true,
                domain: 'pid.pyrates.live'
            },

            transaction: {

                protocol: 'oidc-basic-profile'
            },

            user: {

                email: 'calicojack@pyrates.live',
                user_id: 'auth0|5f7c8ec7c33c6c004bbafe82',
                username: null
            }
        },
    }

    return mocks;
})

describe('Action tests', async () => {

    let consoleLogMock
    let ctor

    beforeAll(async () => {

        consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {})
        vi.mockForNodeRequire('auth0', mocks.auth0Mock)
    })

    beforeEach(() => {

        // Reset mocks to original values from above.

        mocks.auth0Mock.gaResponse.data = [ { name: 'roleA', id: 'R1'}, { name: 'roleB', id: 'R2'}, { name: 'roleC', id: 'R3'}, { name: 'roleD', id: 'R4'}, { name: 'roleE', id: 'R5'} ]
        mocks.auth0Mock.gpResponse.R1.data = [ { permission_name: 'read:apiA' }, { permission_name: 'write:apiA' }, { permission_name: 'update:apiA' }, { permission_name: 'delete:apiA' } ]
        mocks.auth0Mock.gpResponse.R2.data = [ { permission_name: 'read:apiB' }, { permission_name: 'write:apiB' } ]
        mocks.auth0Mock.gpResponse.R3.data = []
        mocks.eventMock.authorization.roles = [ 'roleA', 'roleB', 'roleC' ]
        mocks.eventMock.client.metadata.roles = 'roleA, roleB, roleC'
        mocks.eventMock.secrets.clientId = 'abc'
        mocks.eventMock.secrets.clientSecret = 'xyz'
        mocks.eventMock.secrets.debug = true
        mocks.eventMock.secrets.domain = 'pid.pyrates.live'
        mocks.eventMock.transaction.protocol = 'oidc-basic-profile'
        mocks.eventMock.user.email = 'calicojack@pyrates.live'
        mocks.eventMock.user.user_id = 'auth0|5f7c8ec7c33c6c004bbafe82'
        mocks.eventMock.user.username = null

        consoleLogMock.mockClear()
        mocks.auth0Mock.managementClient.roles.getPermissions.mockClear()
        ctor = vi.spyOn(mocks.auth0Mock, 'ManagementClient').mockImplementation(() => { return { roles: mocks.auth0Mock.managementClient.roles }})

        // Re-establish these functions because the exception tests change them.

        mocks.apiMock.idToken.setCustomClaim = vi.fn(() => {})
        mocks.auth0Mock.managementClient.roles.getAll = vi.fn(async () => new Promise((resolve) => resolve(mocks.auth0Mock.gaResponse)))
    })

    it('Ignores resolving scopes if transaction.protocol is undefined', async () => {

        delete mocks.eventMock.transaction.protocol

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

    it('Ignores resolving scopes if transaction.protocol is null', async () => {

        mocks.eventMock.transaction.protocol = null

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

    it('Ignores resolving scopes if transaction.protocol is empty', async () => {

        mocks.eventMock.transaction.protocol = ''

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

    it('Ignores resolving scopes if transaction.protocol is blank', async () => {

        mocks.eventMock.transaction.protocol = ' '

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

    it('Selects email when username is undefined', async () => {

        delete mocks.eventMock.user.username

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects email when username is empty', async () => {

        mocks.eventMock.user.username = ''

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects email when username is blank', async () => {

        mocks.eventMock.user.username = '     '

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects username over email', async () => {

        mocks.eventMock.user.username = 'blackbeard@pyrates.live'

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('blackbeard@pyrates.live'))
    })

    it('Ignores resolving scopes if the user has no authorization roles', async () => {

        delete mocks.eventMock.authorization.roles

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

    it('Ignores resolving scopes if the user authorization roles are null', async () => {

        mocks.eventMock.authorization.roles = null
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(ctor).not.toHaveBeenCalled()
     })

     it('Ignores resolving scopes if the authorization roles is an empty list', async () => {

        mocks.eventMock.authorization.roles = []
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(ctor).not.toHaveBeenCalled()
     })

     it('Ignores resolving scopes if the authorization roles are all empty', async () => {

        mocks.eventMock.authorization.roles = [ '', ' ' ]

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

     it('Ignores resolving scopes if the client metadata has no roles', async () => {

        delete mocks.eventMock.client.metadata.roles

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).not.toHaveBeenCalled()
    })

     it('Ignores resolving scopes if the client metadata roles is null', async () => {

        mocks.eventMock.client.metadata.roles = null
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(ctor).not.toHaveBeenCalled()
     })

     it('Ignores resolving scopes if the client metadata is empty', async () => {

        mocks.eventMock.client.metadata.roles = ' '
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(ctor).not.toHaveBeenCalled()
     })

     it('Ignores resolving scopes if the client metadata roles is an empty list', async () => {

        mocks.eventMock.client.metadata.roles = ' , '
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(ctor).not.toHaveBeenCalled()
     })

    it('Passes domain, clientID, and clientSecret to initialize managementClient', async () => {

        const expectedOptions = {

            clientId: mocks.eventMock.secrets.clientId,
            clientSecret: mocks.eventMock.secrets.clientSecret,
            domain: mocks.eventMock.secrets.domain
        }

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(ctor).toHaveBeenCalledWith(expectedOptions)
    })

    it('Retrieves the tenant roles', async () => {
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getAll).toHaveBeenCalled()
    })

    it('Ignores finding permissions if there are no tenant roles', async () => {

        mocks.auth0Mock.gaResponse.data = []
 
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).not.toHaveBeenCalled()
    })

    it('Ignores finding permissions if no tenant roles are matched', async () => {

        mocks.auth0Mock.gaResponse.data = [

            { name: 'roleD', id: 'R4'},
            { name: 'roleE', id: 'R5'}
        ]

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).not.toHaveBeenCalled()
    })

    it('Ignores finding permissions if authorization roles and client roles do not overlap', async () => {

        mocks.eventMock.authorization.roles = [ 'roleA' ]
        mocks.eventMock.client.metadata.roles = 'roleB'
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).not.toHaveBeenCalled()
    })

    it('Requests the permissions for one detected role', async () => {

        mocks.eventMock.authorization.roles = [ 'roleA' ]
        mocks.eventMock.client.metadata.roles = 'roleA, roleB, roleC'
        mocks.auth0Mock.gaResponse.data = [ { name: 'roleA', id: 'R1'} ]
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).toHaveBeenCalledWith({ id: 'R1' })
    })

    it('Requests the permissions for multiple detected roles', async () => {

        mocks.eventMock.authorization.roles = [ 'roleA', 'roleB' ]
        mocks.eventMock.client.metadata.roles = 'roleA, roleB'
        mocks.auth0Mock.gaResponse.data = [ { name: 'roleA', id: 'R1'}, { name: 'roleB', id: 'R2'} ]
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).toHaveBeenCalledWith({ id: 'R1' })
        expect(mocks.auth0Mock.managementClient.roles.getPermissions).toHaveBeenCalledWith({ id: 'R2' })
    })

    if('Sets the ID token permissions correctly for no detected roles', async () => {
        
        mocks.eventMock.authorization.roles = [ 'roleA' ]
        mocks.eventMock.client.metadata.roles = 'roleB'
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.apiMock.idToken.setCustomClaim).toHaveBeenCalledWith('x-permissions', [])
    })

    it('Sets the ID token permissions correctly for one detected role', async () => {

        mocks.eventMock.authorization.roles = [ 'roleA' ]
        mocks.eventMock.client.metadata.roles = 'roleA'
        mocks.auth0Mock.gaResponse.data = [ { name: 'roleA', id: 'R1'} ]
        mocks.auth0Mock.gpResponse.R1.data = [ { permission_name: 'read:apiA' }, { permission_name: 'write:apiA' }, { permission_name: 'update:apiA' }, { permission_name: 'delete:apiA' } ]
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.idToken.setCustomClaim).toHaveBeenCalledWith('x-permissions', [ 'read:apiA', 'write:apiA', 'update:apiA', 'delete:apiA' ])
    })
    
    it('Sets the ID token permissions correctly for multiple detected roles', async () => {

        mocks.eventMock.authorization.roles = [ 'roleA', 'roleB' ]
        mocks.eventMock.client.metadata.roles = 'roleA, roleB'
        mocks.auth0Mock.gaResponse.data = [ { name: 'roleA', id: 'R1'}, { name: 'roleB', id: 'R2' } ]
        mocks.auth0Mock.gpResponse.R1.data = [ { permission_name: 'read:apiA' }, { permission_name: 'write:apiA' }, { permission_name: 'update:apiA' }, { permission_name: 'delete:apiA' } ]
        mocks.auth0Mock.gpResponse.R2.data = [ { permission_name: 'read:apiB' }, { permission_name: 'write:apiB' } ]
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.idToken.setCustomClaim).toHaveBeenCalledWith('x-permissions', [ 'read:apiA', 'write:apiA', 'update:apiA', 'delete:apiA', 'read:apiB', 'write:apiB' ])       
    })
    
    it('Sets the ID token permissions correctly when there are no tenant roles', async () => {
        
        mocks.eventMock.authorization.roles = [ 'roleA' ]
        mocks.eventMock.client.metadata.roles = 'roleB'
        mocks.auth0Mock.gaResponse.data = []
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)
 
        expect(mocks.apiMock.idToken.setCustomClaim).toHaveBeenCalledWith('x-permissions', [])
    })

    it ('Enroll emits debugging messages to the console if event.secrets.debug is true', async () => {

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).toHaveBeenCalled()
    })

    it ('Does not emit debugging messages to the console if event.secrets.debug is undefined', async () => {
        
        delete mocks.eventMock.secrets.debug

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Does not emit debugging messages to the console if event.secrets.debug is null', async () => {
        
        mocks.eventMock.secrets.debug = null

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Does not emit debugging messages to the console if event.secrets.debug is false', async () => {

        mocks.eventMock.secrets.debug = false

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Does not emit debugging messages to the console if event.secrets.debug is 0', async () => {
        
        mocks.eventMock.secrets.debug = 0

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Catches exception thrown and logs it during ManagementClient instantiation', async () => {
     
        // Redefine the ManagementClient constructor to throw an exception.

        const message = 'This message should be logged'
        const ctor = vi.spyOn(mocks.auth0Mock, 'ManagementClient').mockImplementation(() => { throw message })

        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(message))
    })

    it('Catches exception thrown and does not log it during ManagementClient instantiation when debug is off', async () => {
     
        mocks.eventMock.secrets.debug = false

        // Redefine the ManagementClient constructor to throw an exception.

        const message = 'This message should be logged'
        const ctor = vi.spyOn(mocks.auth0Mock, 'ManagementClient').mockImplementation(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Catches exception thrown and logs it during manmagement API calls', async () => {
     
        // Redefine the API deny call to throw an exception.

        const message = 'This message should be logged'

        mocks.auth0Mock.managementClient.roles.getAll = vi.fn(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
        expect(consoleLogMock).toHaveBeenCalled()
    })

    it('Catches exception thrown and logs it during API calls', async () => {

        // Redefine the API deny call to throw an exception.

        const message = 'This message should be logged'

        mocks.apiMock.idToken.setCustomClaim = vi.fn(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
    })

    it('Catches exception thrown and does not log it during API calls when deubg is off', async () => {

        mocks.eventMock.secrets.debug = false

        // Redefine the API deny call to throw an exception.

        const message = 'This message should be logged'

        mocks.apiMock.idToken.setCustomClaim = vi.fn(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
        expect(consoleLogMock).not.toHaveBeenCalled()
    })
})