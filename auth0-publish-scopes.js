/**
 * auth0-publish-scopes
 * Copyright © 2024 Joel A Mussman. All rights reserved.
 * 
 * This Action code is released under the MIT license and is free to copy and modify as
 * long as the source is attributed.
 * 
 * Add an 'x-permissions' claim to the ID token which contains a list of permissions (scopes)
 * the user is allowed for the application authentication is performed for. The application
 * may use x-permissions as the known permissions to request for an access token. This moves
 * the configuration of which users have what permissions from the application data store
 * to the administration of the identity provider (Auth0).
 * 
 * This Action only handles permissions for a single back-end API. Multiple APIs may be
 * handled by extending it with additional claims for each API.
 * 
 * The authorication object has the list of roles the user has been assigned. But, it is a
 * complete list, so this function retrieves the list of roles the application supports from
 * the application metadata, and produces the intersection of those two lists.
 * 
 * Once the list of roles for the user->application is determined, the management API is
 * used extract the ID of each role, and then the permissions from each of those roles.
 * The permissions are published as an array of strings in the ID token as 'x-permissions'.
 * The list of permissions is the list of scopes for the application to request from
 * /authorize for the API access token.
 * 
 * To configure this a machine-to-machine application needs to be configured in the tenant
 * which will talk to the default 'Auth0 Management API' to make management API requests.
 * The roles required for this application to service this action are 'read:users',
 * 'read:roles','read:role_members'. Store the domain and credentials in the Action
 * secrets: 'domain', 'clientId', and 'clientSecret'.
 * 
 * Add the 'auth0' Node.js dependency at the latest version, and add the secrets for
 * *domain*, *clientId*, and *clientSecret* from the M2M application configuration.
 */

exports.onExecutePostLogin = async (event, api) => {

    const DEBUG = event.secrets.debug;

    DEBUG ? console.log('auth0-publish-scopes') : null;

    // This only applies on requests resulting in an ID token.

    if (/^oidc-basic-profile|oidc-implicit-profile|oauth2-resource-owner-jwt-bearer|oauth2-password|oauth2-refresh-token|oidc-hybrid-profile$/.test(event.transaction.protocol)) {

        const username = event.user.username ?? event.user.email;

        DEBUG ? console.log(`auth0-publish-scopes will issue ID token for ${event.user.user_id} (${username})`) : null;

        let permissions = [];

        if (event.authorization?.roles) {
        
            DEBUG ? console.log(`Authorization roles found processing ${event.user.user_id} (${username})`) : null;

            // Split the application roles.

            let roles = event.client.metadata['roles'].split(',').map(role => role.trim());

            // Filter the application roles by the user roles assigned.

            let xRoles = roles.filter(role => event.authorization?.roles.includes(role));
        
            DEBUG ? console.log(`Authorization roles found for user ${event.user.user_id} (${username}): ${JSON.stringify(xRoles)}`) : null;

            // Set up the connection to the management API (act as the management API client).

            const ManagementClient = require('auth0').ManagementClient;

            const management = new ManagementClient({

                domain: event.secrets.domain,
                clientId: event.secrets.clientId,
                clientSecret: event.secrets.clientSecret,
            });

            try {

                // Retrieve all the roles defined in the Auth0 tenant ('data' is an array of role objects).
        
                DEBUG ? console.log(`Connecting to management API for ${event.user.user_id} (${username})`) : null;

                const allRoles = await management.roles.getAll();

                // Filter the roles against list of names in xRoles.

                const filteredRoles = allRoles.data.filter(role => xRoles.includes(role.name));

                // Extract the id of each role.

                const roleIds = filteredRoles.map(role => role.id);

                // Walk each role and get the permissions; append to the list of permissions.

                for (let roleId of roleIds) {

                    // 'data' is an array of permission objects.

                    const rolePermissions = await management.roles.getPermissions({ id: roleId });

                    permissions.push(...(rolePermissions.data.map(permission => permission.permission_name)));
                }
    
                DEBUG ? console.log(`Calculated permissions for ${event.user.user_id} (${username}): ${JSON.stringify(permissions)}`) : null;
            }

            catch (e) {
                        
                DEBUG ? console.log(e) : null;

                // Handle the error by returning the empty permission array. As an additional feature
                // a claim could be inserted about the error, but do not leak information here.

                // api.idToken.setCustomClaim('x-permissionsfail', e);
            }
        }

        // Insert the x-permissions claim; it will be an empty array if nothing was found.
        
        DEBUG ? console.log(`Setting custom claim x-permissions for ${event.user.user_id} (${username})`) : null;

        api.idToken.setCustomClaim('x-permissions', permissions);
    }
}