import {HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {ApplicationConfig, LOCALE_ID} from '@angular/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling} from '@angular/router';
import {providePrimeNG} from 'primeng/config';
import {appRoutes} from './app.routes';
import Material from '@primeng/themes/material';
import {definePreset} from '@primeng/themes';
import {JWT_OPTIONS, JwtHelperService, JwtInterceptor} from "@auth0/angular-jwt";
import {apiInterceptor} from "./interceptors/api.interceptor";
import {HashLocationStrategy, LocationStrategy} from "@angular/common";

const MyPreset = definePreset(Material, {
	semantic: {
		primary: {
			50: '{blue.50}',
			100: '{blue.100}',
			200: '{blue.200}',
			300: '{blue.300}',
			400: '{blue.400}',
			500: '{blue.500}',
			600: '{blue.600}',
			700: '{blue.700}',
			800: '{blue.800}',
			900: '{blue.900}',
			950: '{blue.950}'
		}
	}
});

export const httpInterceptorsProviders = [
	{provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true},
];

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(
			appRoutes,
			withInMemoryScrolling({
				anchorScrolling: 'enabled',
				scrollPositionRestoration: 'enabled'
			}),
			withEnabledBlockingInitialNavigation()
		),
		JwtHelperService,
		httpInterceptorsProviders,
		provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
		provideAnimationsAsync(),
		providePrimeNG({
			ripple: true,
			inputStyle: 'filled',
			theme: {preset: MyPreset, options: {darkModeSelector: '.app-dark'}}
		}),
		{ provide: LocationStrategy, useClass: HashLocationStrategy },
		{ provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
		// { provide: LOCALE_ID, useValue: 'fr-FR' }
	]
};
