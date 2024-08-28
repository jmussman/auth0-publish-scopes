![Banner Light](./.assets/banner-auth0-publish-scopes-light.png#gh-light-mode-only)
![banner Dark](./.assets/banner-auth0-publish-scopes-dark.png#gh-dark-mode-only)

# Auth0-Publish-Scopes

## Overview

Which scopes an application should request for a particular user when obtaining an access token is a common problem in OAuth2-aware applications.
The easy solution is to request the same scopes for all users.
It is hardwired and everyone gets the same access at the web service (API).

What if some users have more access than others?
Well then one solution is the application keeps a database of what scopes to ask for what user.
That database has to agree with the permissions granted to the user by the authorization server.
Maintaining the information in two places is a recipe for mistakes and disagreement.

So if the authorization server knows what permissions are granted, and therefore what scopes may be added to the access token claims, why
not just add all of them?
Well, that voilates "least privilege"; uncessary scopes listed lead to possible accidents and open the possibility of more damage if a
token is compromised!
That is the reason that applications request specific scopes.

So the authorization server manages the permissions for a user, and ought to be able to tell the application what scopes are authorized to be granted for that specific user.
The easy way to do this is to add a claim to the ID token when it is requested, and then the application can learn what permissions the
user is granted and ask for the specific permissions it wants from that set.
This of course requires two round-trips to the authorization server, one to pick up the ID token, and the second to pick up an API access
token with the necessary permissions.
An example of doing the two-step for a SPA is located in the project [Auth0-Pyrates-SPA](https://jmussman/auth0-pyrates-spa).

Building on top of that, if the application gets the list of what permissions the user actually has, it can use that information
to limit what the user can see in the application.
The API access token may not be what the application focus is on.

This is one of a series of action examples that may be used as a foundation for building
what you need.
Search GitHub for *jmussman/auth0* to find other examples in the series.

## Implementation

This implementation depends on *roles*.
In Auth0 tenants permissions are defined by API configurations, and specific permissions for users are attached to roles assigned to users.
When /authorize is called for a user, all of the roles the user is assigned are listed in the event passed to the post-login action flow.
That event also has the list of roles assigned to the application.
The first step is to calculate the intersection of the user and application roles, that is what is possible for the user in the application.

The second step is to extract the specific permissions for the set of roles.
The post-login action needs to use the management API to find all the roles, filter that specifically to the roles the user has,
and then extract the permissions assigned to each of those roles.

The extracted list of permissions can be added as a claim to the ID token, in this case 'x-permissions' is used as the claim name.
The application can access that claim, select all or a subset of the permissions, and then make the request for the access token
to call the API.

## Configuration

This assumes basic knowledge of working with actions and adding actions to flows in Auth0.
This is an overview of the configuration that must be established.

### Steps

1. Create or use an existing M2M application configuration that has *read:roles* permission in the Management API.
2. Create a new post-login action using the code in the *auth0-publish-scopes.js* file.
3. Add the *auth0* Node.js package as a dependency for the action.
4. Add secrets for *domain*, *clientId*, and *clientSecret* using the values from the application in step 1.
5. Add a secret *debug* with a value of true for console messages during testing, clear it for production. A re-deployment is neccessary after changing a secret.
6. Save and deploy the action in the post-login flow.

## Unit Tests

Auth0 flow actions provide a rduimentary mechanism for testing.
The custom database actions do not provide a testing feature.
All actions can be monitored for console output using the *Realtime WebTask Logs Extension* in the Auth0 tenant.
When launched by clicking the extension, consent must be provided for it to access the console.
All messages written to console.log will be visible here; a strong recommendation is to only use this in the development sandbox or there will be too many
messages to wade through.

The flow actions testing mechanism allows a mock event to be edited and then the action tested.
Unfortunately, the only way to managem multiple tests with any success is to manage different event configurations outside of the console,
and then paste them in turn to perform tests.

Any significant action must have all possible paths of execution checked, with both positive and negative configurations.
There is no reason that the event and api objects cannot be mocked, and actions tested, outside of Auth0.
As an example of how to do with for a action this project has a full suite of unit tests, written in *Vitest*, with a high percentage of code-coverage.
Vitest performs much better than Jest at asynchromous testing, which is often the case with an action.

At the command line in the project folder:

* Execute *npm install* to add the Vitest packages.
* Run *npm test* to run all the unit tests
* Run *npm run test-coverage* to run the test suite with code-coverage (currently at 100%).

## License

The code is licensed under the MIT license. You may use and modify all or part of it as you choose, as long as attribution to the source is provided per the license. See the details in the [license file](./LICENSE.md) or at the [Open Source Initiative](https://opensource.org/licenses/MIT).


<hr>
Copyright © 2024 Joel A Mussman. All rights reserved.