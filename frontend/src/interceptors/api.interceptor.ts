import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from "@angular/core";
import {environment} from "@environments/environment";
import {ApplicationMessageService} from "../services/message-service.service";

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
	const applicationMessageService = inject(ApplicationMessageService);
	const apiUrl = environment.apiUrl;
	const url = environment.url;
	const token = localStorage.getItem('access_token');

	const isAbsoluteUrl = (url: string) => {
		const absolutePattern = /^http?:\/\//i;
		return absolutePattern.test(url);
	};

	const preparerUrl = (url: string) => {
		if (['assets', 'data', 'commits.json'].some(keyword => url.includes(keyword))) {
			return url;
		}

		url = isAbsoluteUrl(url) ? url : apiUrl + '/' + url;
		return url.replace(/([^:]\/)\/+/g, '$1');
	};


	// Clone the request and add the authorization header
	const authReq = req.clone({
		url: preparerUrl(req.url),
		withCredentials: true,
		setHeaders: {
			'Authorization': token ?? '',
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Origin': url,
			'Access-Control-Expose-Headers': 'Authorization',
		}
	});

	applicationMessageService.clear();
	return next(authReq);
};
