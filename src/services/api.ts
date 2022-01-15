import axios, { AxiosError } from "axios";
import { GetServerSidePropsContext } from "next";
import { parseCookies, setCookie } from "nookies";
import { SignOut } from "../contexts/AuthContext";
import { AuthTokenError } from "../errors/AuthTokenError";

type FailedRequestQueue = {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
};

type Context = undefined | GetServerSidePropsContext;

let isRefreshing = false;
let failedRequestsQueue = Array<FailedRequestQueue>();

export function setupAPIClient(context:Context=undefined) {
  let cookies = parseCookies(context);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  });
  
  api.interceptors.response.use(response => {
    return response;
  }, (error: AxiosError) => {
    if(error.response?.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        // renova token
        cookies = parseCookies(context);
  
        const { 'nextauth.refreshToken': refreshToken } = cookies;
        const originalConfig = error.config;
  
        if (!isRefreshing) {
          isRefreshing = true;
  
          api.post('/refresh', {
            refreshToken
          }).then(response => {
            const { token } = response.data;
    
            setCookie(context, "nextauth.token", token, {
              maxAge: 60 * 60 * 24 * 30, // 30 dias
              path: "/",
            });
      
            setCookie(context, "nextauth.refreshToken", response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 dias
              path: "/",
            });
    
            api.defaults.headers["Authorization"] = `Bearer ${token}`;
  
            failedRequestsQueue.forEach(request => request.onSuccess(token));
            failedRequestsQueue = [];
  
            if (process.browser) {
              SignOut();
            }
          }).catch(err => {
            failedRequestsQueue.forEach(request => request.onFailure(err));
            failedRequestsQueue = [];
          }).finally(() => {
            isRefreshing = false;
          })
        }
  
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;
              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            }
          })
        })
      } else {
        if (process.browser) {
          SignOut();
        } else {
          return Promise.reject(new AuthTokenError);
        }
      }
    }
  
    return Promise.reject(error);
  });

  return api;
  
}