/**
 * Shared GraphQL Operations
 *
 * Documents used by more than one component. Single-consumer operations
 * stay next to the component that runs them.
 *
 * Exports: MeQuery, LoginUserMutation
 *
 * Used by: RequireAuth, HomePage, LoginPage
 */
import { graphql } from "@/gql";

export const MeQuery = graphql(`
  query Me {
    me {
      id
      firstName
    }
  }
`);

export const LoginUserMutation = graphql(`
  mutation LoginUser($input: LoginUserInput!) {
    loginUser(input: $input) {
      accessToken
      user {
        id
        firstName
      }
    }
  }
`);
