
import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify } from 'jsonwebtoken'
import { JwtToken } from '../../auth/JwtToken'

const cert = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIJbg6rk+0UgDa8MA0GCSqGSIb3DQEBCwUAMCQxIjAgBgNV
BAMTGWRldi1yaDlxdnhubS51cy5hdXRoMC5jb20wHhcNMjIwODI1MTQyMzE1WhcN
MzYwNTAzMTQyMzE1WjAkMSIwIAYDVQQDExlkZXYtcmg5cXZ4bm0udXMuYXV0aDAu
Y29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA593iAFPBXHmopR8w
+NYa2kO8KkdUaZjCMwxrziAQGJ+68dYAy6hC9QKxlNnPYTyIjGId7OhnoT3EvZjo
0YO6gf+JBKR8NyqmJ0gUWem0owlgfFeQr2yla60Td1OnIUfCrgCLkHO32COC/Nkk
+wVC86Ytwqg39M2ugyva/JKcZIpo9DiXLU+OJC9cyTO+QHx6000M43gudf9ki7/h
J1Z93dPjkPCs2aH7h2KqUE6Y6W26wneui/NjIxAKMNXoskswhc0hlCO0y8qQv8eT
w4c2BQMyLUUkMH9ReeNUjtOd/YjrzTEiLm/itP4UXwalRLWBCSNOCsGPjaaqlPI5
59+QrwIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBT37j+2TZ6P
oLT/oJ5+IUeoW4G4FDAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEB
ADrqh6DqbhtUPbB/WEBrZ0oiXNHFSt6a3RTuXqmIoqFZEA2clI91dS70R96ylJS7
SHsT+6haAyBxs0EZvioLJxZ/TCRhT6xaIToU+guBaCQ0hzp/PZyWjYZg6rfN9c5V
yeo6244kwd4WywTE++Cbxda57hEKnyy8DIgTxzXJz4U2L/gDbIKZBY8M1VJRDCoz
fYSnEsUgKpm95kgiaeSO/8KEUN0oneWS7YIqavo3jvj6LaaF9nHFEgx9xZgXK6OM
uZUqytWGVjtejgqbUbrQaaPEDKbdXtd4rRZCg1xyoCXEskt4qdYasiIDT5spFZE9
CM/IT8Aj+n3066ZQO4XydQw=
-----END CERTIFICATE-----`

export const handler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
  try {
    const jwtToken = verifyToken(event.authorizationToken)
    console.log('User was authorized', jwtToken)

    // API gateway policy
    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    console.log('User authorized', e.message)

    // IAM policy denying access
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

// verify token function
function verifyToken(authHeader: string): JwtToken {
  if (!authHeader)
    throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  // specify algorithm to use 
  return verify(token, cert, { algorithms: ['RS256'] }) as JwtToken
}
