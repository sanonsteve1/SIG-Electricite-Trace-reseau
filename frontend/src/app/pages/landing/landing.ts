import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {FeaturesWidget} from './components/featureswidget';
import {FooterWidget} from './components/footerwidget';
import {Topbar} from '@/pages/landing/components/topbar';
import {HeroWidget} from '@/pages/landing/components/herowidget';
import {WhoUsesWidget} from '@/pages/landing/components/whouses';
import {CollaborationWidget} from '@/pages/landing/components/collaborationwidget';
import {EasyFollowWidget} from '@/pages/landing/components/easyfollowwidget';
import {ShowReelsWidget} from '@/pages/landing/components/showreelswidget';
import {NewsletterWidget} from '@/pages/landing/components/newsletterwidget';
import {LayoutService} from '@/layout/service/layout.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule, Topbar, HeroWidget, WhoUsesWidget, FeaturesWidget, CollaborationWidget, EasyFollowWidget, ShowReelsWidget, NewsletterWidget, FooterWidget],
    template: `
        <div class="bg-surface-50 dark:bg-surface-950">
            <topbar />
            <div class="h-screen">
                <div style="perspective: 101px" class="h-screen overflow-x-hidden overflow-y-auto absolute top-0 left-0 right-0 bottom-0">
                    <hero-widget />
                    <div id="parallaxBody" class="lg:top-full block absolute left-0 right-0 h-full z-20">
                        <who-uses-widget />
                        <features-widget>
                            <collaboration-widget />
                            <easy-follow-widget />
                            <show-reels-widget />
                            <newsletter-widget />
                            <footer-widget />
                        </features-widget>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: `
        ::placeholder {
            color: #fff;
        }
    `
})
export class Landing implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    ngOnInit() {
        if (!this.layoutService.isDarkTheme()) {
            this.layoutService.layoutConfig.update((state) => ({
                ...state,
                darkTheme: true
            }));
        }
    }

    ngOnDestroy() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            menuTheme: state.darkTheme ? 'dark' : 'light'
        }));
    }
}
