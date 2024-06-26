import { RouterPages } from '../app/app';
import { authState, categoryState, routerState } from '@state/state.ts';
import getPath from '@utils/get-path.ts';
import { ModifyCategory } from '@utils/categories-creator.ts';
import { getAncestorCategories, getCategoryByKey, validatePath } from '@utils/categories-formatter.ts';

const enum NavigationDirection {
  forward = 'forward',
  backward = 'backward',
}

export default class HandlerRouter {
  private readonly callback: (requestParams: { path: string; resource: string }) => void;

  constructor(callback: (requestParams: { path: string; resource: string }) => void) {
    this.callback = callback;

    window.addEventListener('popstate', (e: PopStateEvent) => this.handleRoutePopState.call(this, e));
    window.addEventListener('load', this.renderPageOnLoad.bind(this));
  }

  public navigate<T extends RouterPages>(event: T, resource = ''): void {
    if (authState.getState().isAuthorized && (event === RouterPages.signin || event === RouterPages.signup)) {
      this.callback({ path: RouterPages.main, resource: '' });
      this.setHistory(RouterPages.main, NavigationDirection.forward);
      routerState.getState().setPage(RouterPages.main);
      return;
    }
    const historyUrl = resource ? `${event}/${resource}` : event;
    this.callback({ path: event, resource });
    this.setHistory(historyUrl, NavigationDirection.forward);
  }

  public navigateForCategories(path: string): void {
    this.setHistory(path, NavigationDirection.forward);
  }

  private handleRoutePopState(e: PopStateEvent): void {
    const path: string[] = window.location.pathname.slice(1).split('/');
    const historyPath: RouterPages | undefined = getPath(path[0]);
    const resource = path[1];

    const state = e.state || {};
    const direction = state.direction || NavigationDirection.backward;

    if (
      (authState.getState().isAuthorized &&
        (historyPath === RouterPages.signin || historyPath === RouterPages.signup)) ||
      (!authState.getState().isAuthorized && historyPath === RouterPages.profile)
    ) {
      if (direction === NavigationDirection.forward) {
        window.history.replaceState({ direction: NavigationDirection.backward }, '', `/${path.join('/')}`);
        window.history.go(-1);
      } else {
        window.history.replaceState({ direction: NavigationDirection.forward }, '', `/${path.join('/')}`);
        window.history.go(1);
      }
      return;
    }

    if (historyPath) {
      if (resource) {
        this.callback({ path: historyPath, resource });
      } else {
        this.callback({ path: historyPath, resource: '' });
      }
      const route = getPath(historyPath);
      if (route) routerState.getState().setPage(route);
    }
  }

  private setHistory(url: string, direction: NavigationDirection): void {
    window.history.pushState({ direction }, '', `/${url}`);
  }

  private renderPageOnLoad(): void {
    const path: string[] = window.location.pathname.slice(1).split('/');
    const foundPath: RouterPages | undefined = getPath(path[0]);
    const resource = path[1];

    const categoriesState: ModifyCategory[] | [] = categoryState.getState().categories;
    const checkResource: ModifyCategory | undefined = getCategoryByKey(categoriesState, resource);

    if (
      (authState.getState().isAuthorized && (foundPath === RouterPages.signin || foundPath === RouterPages.signup)) ||
      (!authState.getState().isAuthorized && foundPath === RouterPages.profile)
    ) {
      this.navigate(RouterPages.main);
      routerState.getState().setPage(RouterPages.main);
      return;
    }

    if (foundPath === RouterPages.products && checkResource !== undefined) {
      const lastElementPath = path[path.length - 1];
      const checkLastElementPath: ModifyCategory | undefined = getCategoryByKey(categoriesState, lastElementPath);
      const checkEveryElementPath: boolean = validatePath(path);

      if (checkLastElementPath !== undefined && checkEveryElementPath) {
        categoryState.getState().setCategory(checkLastElementPath.id);
        const currentCategory = categoryState.getState().category;

        const path = getAncestorCategories(categoriesState, currentCategory as string)
          .map((cat) => cat.key)
          .join('/');

        const fullPath: string = `${RouterPages.products}/${path}`;

        this.setHistory(fullPath, NavigationDirection.forward);
        this.callback({ path: foundPath, resource });
        routerState.getState().setPage(RouterPages.products);
      } else {
        this.navigate(RouterPages.not_found);
        routerState.getState().setPage(RouterPages.not_found);
        return;
      }
      return;
    } else if (foundPath === RouterPages.products && categoriesState[0] && checkResource === undefined && resource) {
      categoryState.getState().setCategory(categoriesState[0].id);
      this.navigate(RouterPages.not_found);
      routerState.getState().setPage(RouterPages.not_found);
      return;
    }

    if (foundPath === RouterPages.product && resource) {
      this.navigate(RouterPages.product, resource);
      routerState.getState().setPage(RouterPages.product);
      return;
    } else if (foundPath) {
      this.navigate(foundPath);
      routerState.getState().setPage(foundPath);
      return;
    }

    if (!foundPath) {
      this.navigate(RouterPages.main);
      routerState.getState().setPage(RouterPages.main);
      return;
    }

    this.navigate(RouterPages.not_found);
    routerState.getState().setPage(RouterPages.not_found);
  }
}
