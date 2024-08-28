const onExecutePostLogin = require('../src/auth0-publish-scopes');

describe('auth0-publish-scopes', () => {

    let apiMock;
    let auth0Mock;
    let ManagementClientMock;
    let requireMock;
    let rolesGetAllMock;
    let roleGetPermissionsMock;

    beforeEach(() => {

        // Starting framework for the event, api objects, and ManagementClient class.

        event = {

            authorization: {
                roles: [ 'Green Dragon Innkeeper', 'Pyrate Admin' ]
            },
            client: {
                metadata: {
                    'roles': 'Green Dragon Innkeeper, Pyrate Admin'
                }
            },
            email: 'jack.rackham@potc.live',
            transaction: {
                protocol: 'openid-basic-profile'
            },
            user: {
                user_id: 'auth0|6644e0f9fcacdcaa7fdd135e'
            },
            username: 'jackrackham@potc.live'
        };

        api = {

            idToken: {
                
                // This is the only action called from the code under test to the api:

                setCutomClaim: jest.fn()
            }
        }

        getPermissionsMock = jest.fn(); // seperated from the ManagementClentClass to initialize before the class is instantiated.

        ManagementClientClassMock = class {

            constructor(options) {

                this.roles = {

                    getAll: rolesGetAllMock,
                    getPermissions: roleGetPermissionsMock
                }
            }
        }

        auth0Mock = {

            ManagementClient: ManagementClientMock
        }

        // Override require  for the code under test to provide mocks of the node modules.

        requireMock = (package) => {

            let result = null;

            switch (package) {
                case 'auth0':
                    result = auth0Mock;
                    break;
            }

            return result;
        });

        require = jest.fn((package) => requireMock(package));
    });

    test*'Empty user roles in authorization', () => {

        eventMock.authorization.roles = [];

        const result = onExecutePostLogin(eventMock, apiMock);

        expect(result.length).toBe(0);
    }

    test*'No user authorization', () => {

        delete eventMock.authorization;

        const result = onExecutePostLogin(eventMock, apiMock);

        expect(result.length).toBe(0);
    }

    test*'No user roles in authorization', () => {

        delete eventMock.authorization.roles;

        const result = onExecutePostLogin(eventMock, apiMock);

        expect(result.length).toBe(0);
    }

    // Remove trailing space from application role

    // Remove leading space from application role

    test('User has all roles defined for application', () => {

        auth0Mock.man
        rolesGetAllMock.mockReturnValue({ name: 'Green Dragon Innkeepers' }, { name: 'Pyrate Admin' });
        getPermissionsMock.mockReturnValue()

        require.mockReturnValue({ ManagementClient: ManagementClientMock})

        expect(permissions.length).toBe(0);
    });
});