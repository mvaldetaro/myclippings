/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRoute } from "./routes/__root";

import { Route as IndexRoute } from "./routes/index";
import { Route as LoginRoute } from "./routes/login";
import { Route as RegisterRoute } from "./routes/register";
import { Route as ImportRoute } from "./routes/import";
import { Route as SettingsRoute } from "./routes/settings";
import { Route as BooksIndexRoute } from "./routes/books/index";
import { Route as BooksBookIdRoute } from "./routes/books/$bookId";
import { Route as FavoritesIndexRoute } from "./routes/favorites/index";
import { Route as QuotesClipRoute } from "./routes/quotes/$bookId.$clipId";

/**
 * Aplica `getParentRoute`, `path` e `id` nas rotas para compatibilidade
 * com @tanstack/react-router >= 1.170.x. Nessa versão, o `createFileRoute`
 * não injeta path/parent automaticamente.
 */
IndexRoute.update({ path: "/" });
LoginRoute.update({ path: "/login" });
RegisterRoute.update({ path: "/register" });
ImportRoute.update({ path: "/import" });
SettingsRoute.update({ path: "/settings" });
BooksIndexRoute.update({ path: "/books" });
BooksBookIdRoute.update({ path: "/books/$bookId" });
FavoritesIndexRoute.update({ path: "/favorites" });
QuotesClipRoute.update({ path: "/quotes/$bookId/$clipId" });

// Define getParentRoute para todas as rotas filhas
const getRoot = () => rootRoute;
IndexRoute.options.getParentRoute = getRoot;
LoginRoute.options.getParentRoute = getRoot;
RegisterRoute.options.getParentRoute = getRoot;
ImportRoute.options.getParentRoute = getRoot;
SettingsRoute.options.getParentRoute = getRoot;
BooksIndexRoute.options.getParentRoute = getRoot;
BooksBookIdRoute.options.getParentRoute = getRoot;
FavoritesIndexRoute.options.getParentRoute = getRoot;
QuotesClipRoute.options.getParentRoute = getRoot;

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexRoute;
      parentRoute: typeof rootRoute;
    };
    "/login": {
      id: "/login";
      path: "/login";
      fullPath: "/login";
      preLoaderRoute: typeof LoginRoute;
      parentRoute: typeof rootRoute;
    };
    "/register": {
      id: "/register";
      path: "/register";
      fullPath: "/register";
      preLoaderRoute: typeof RegisterRoute;
      parentRoute: typeof rootRoute;
    };
    "/import": {
      id: "/import";
      path: "/import";
      fullPath: "/import";
      preLoaderRoute: typeof ImportRoute;
      parentRoute: typeof rootRoute;
    };
    "/settings": {
      id: "/settings";
      path: "/settings";
      fullPath: "/settings";
      preLoaderRoute: typeof SettingsRoute;
      parentRoute: typeof rootRoute;
    };
    "/books/": {
      id: "/books/";
      path: "/books";
      fullPath: "/books";
      preLoaderRoute: typeof BooksIndexRoute;
      parentRoute: typeof rootRoute;
    };
    "/books/$bookId": {
      id: "/books/$bookId";
      path: "/books/$bookId";
      fullPath: "/books/$bookId";
      preLoaderRoute: typeof BooksBookIdRoute;
      parentRoute: typeof rootRoute;
    };
    "/favorites/": {
      id: "/favorites/";
      path: "/favorites";
      fullPath: "/favorites";
      preLoaderRoute: typeof FavoritesIndexRoute;
      parentRoute: typeof rootRoute;
    };
    "/quotes/$bookId/$clipId": {
      id: "/quotes/$bookId/$clipId";
      path: "/quotes/$bookId/$clipId";
      fullPath: "/quotes/$bookId/$clipId";
      preLoaderRoute: typeof QuotesClipRoute;
      parentRoute: typeof rootRoute;
    };
  }
}

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  LoginRoute,
  RegisterRoute,
  ImportRoute,
  SettingsRoute,
  BooksIndexRoute,
  BooksBookIdRoute,
  FavoritesIndexRoute,
  QuotesClipRoute,
});
