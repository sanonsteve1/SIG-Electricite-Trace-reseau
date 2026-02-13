import {Routes} from '@angular/router';
import {Version} from '@/administration/version/version';

export default [
	{path: '', redirectTo: '/administration/version', pathMatch: 'full'},
    {
        path: 'version',
        data: { breadcrumb: 'Version' },
        component: Version
    },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
