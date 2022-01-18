import decode from "jwt-decode";
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../errors/AuthTokenError";
import { ValidateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
  permissions?: string[];
  roles?: string[];
}

type DecodeProps = {
  permissions: string[];
  roles: string[];
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions) {
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context);
    const token = cookies['nextauth.token'];
  
    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    if (options) {
      const user = decode<DecodeProps>(token);
      const { permissions, roles } = options;

      const userHasValidPermissions = ValidateUserPermissions({
        user, permissions, roles
      });

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
        }
      }
    }

    try {
      return await fn(context);
    }
    catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(context, "nextauth.token");
        destroyCookie(context, "nextauth.refreshToken");
  
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
    }
  }
}