import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, computed, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { updatePreset, updateSurfacePalette } from '@primeng/themes';
import Material from '@primeng/themes/material';
import { PrimeNG } from 'primeng/config';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LayoutService, MenuMode } from '@/layout/service/layout.service';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';

const presets = {
    Material
} as const;

declare type KeyOfType<T> = keyof T extends infer U ? U : never;

declare type SurfacesType = {
    name?: string;
    palette?: {
        0?: string;
        50?: string;
        100?: string;
        200?: string;
        300?: string;
        400?: string;
        500?: string;
        600?: string;
        700?: string;
        800?: string;
        900?: string;
        950?: string;
    };
};

@Component({
    selector: 'app-configurator',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectButtonModule, DrawerModule, ToggleSwitchModule, RadioButtonModule],
    template: `
        <button *ngIf="simple" class="layout-config-button config-link" type="button" (click)="toggleConfigSidebar()">
            <i class="pi pi-cog"></i>
        </button>

        <p-drawer [(visible)]="visible" (onHide)="layoutService.hideConfigSidebar()" position="right" [transitionOptions]="'.3s cubic-bezier(0, 0, 0.2, 1)'" styleClass="layout-config-sidebar w-80" header="Settings">
            <div class="flex flex-col gap-4">
                <div>
                    <span class="text-lg font-semibold">Primary</span>
                    <div class="pt-2 flex gap-2 flex-wrap">
                        @for (primaryColor of primaryColors(); track primaryColor.name) {
                            <button
                                type="button"
                                [title]="primaryColor.name"
                                (click)="updateColors($event, 'primary', primaryColor)"
                                [ngClass]="{
                                    'outline-primary': primaryColor.name === selectedPrimaryColor()
                                }"
                                class="cursor-pointer w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center p-0 outline-none outline-offset-1"
                                [style]="{
                                    'background-color': primaryColor?.name === 'noir' ? 'var(--text-color)' : primaryColor?.palette?.['500']
                                }"
                            ></button>
                        }
                    </div>
                </div>

                <div>
                    <span class="text-lg font-semibold">Surface</span>
                    <div class="pt-2 flex gap-2 flex-wrap">
                        @for (surface of surfaces; track surface.name) {
                            <button
                                type="button"
                                [title]="surface.name"
                                (click)="updateColors($event, 'surface', surface)"
                                class="cursor-pointer w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center p-0 outline-none outline-offset-1"
                                [ngClass]="{
                                    'outline-primary': selectedSurface() ? selectedSurface() === surface.name : isDarkTheme() ? surface.name === 'zinc' : surface.name === 'slate'
                                }"
                                [style]="{
                                    'background-color': surface?.palette?.['500']
                                }"
                            ></button>
                        }
                    </div>
                </div>

                <!-- 'Color Scheme' Section -->
                <div class="flex flex-col gap-2">
                    <span class="text-lg font-semibold">Color Scheme</span>
                    <p-selectbutton [(ngModel)]="darkTheme" [options]="themeOptions" optionLabel="name" optionValue="value" [allowEmpty]="false"></p-selectbutton>
                </div>

                <ng-container *ngIf="!simple">
                    <div class="flex flex-col gap-2">
                        <span class="text-lg font-semibold">Menu Type</span>
                        <div class="flex flex-wrap flex-col gap-3">
                            <div class="flex">
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="static" [(ngModel)]="menuMode"></p-radio-button>
                                    <label for="static">Static</label>
                                </div>

                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="overlay" [(ngModel)]="menuMode"></p-radio-button>
                                    <label for="overlay">Overlay</label>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="slim" [(ngModel)]="menuMode"></p-radio-button>
                                    <label for="slim">Slim</label>
                                </div>
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="slim-plus" [(ngModel)]="menuMode" inputId="slim-plus"></p-radio-button>
                                    <label for="slim-plus">Slim+</label>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="reveal" [(ngModel)]="menuMode"></p-radio-button>
                                    <label for="reveal">Reveal</label>
                                </div>
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="drawer" [(ngModel)]="menuMode" inputId="drawer"></p-radio-button>
                                    <label for="drawer">Drawer</label>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuMode" value="horizontal" [(ngModel)]="menuMode"></p-radio-button>
                                    <label for="horizontal">Horizontal</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span class="text-lg font-semibold">Menu Profile</span>
                        <div class="flex flex-wrap flex-col gap-3">
                            <div class="flex">
                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuProfilePosition" value="start" [(ngModel)]="menuProfilePosition"></p-radio-button>
                                    <label for="start">Start</label>
                                </div>

                                <div class="flex items-center gap-2 w-1/2">
                                    <p-radio-button name="menuProfilePosition" value="end" [(ngModel)]="menuProfilePosition"></p-radio-button>
                                    <label for="end">End</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span class="text-lg font-semibold">Menu Themes</span>
                        <p *ngIf="isDarkTheme(); else menu_theme_selector">Menu themes are only available in light mode by design as large surfaces can emit too much brightness in dark mode.</p>
                        <ng-template #menu_theme_selector>
                            <div class="pt-2 flex gap-2 flex-wrap">
                                @for (theme of menuThemes; track theme) {
                                    <button
                                        type="button"
                                        class="cursor-pointer w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center p-0 outline-none outline-offset-1 shadow"
                                        (click)="changeMenuTheme(theme.name)"
                                        [ngStyle]="{ 'background-color': theme.color }"
                                    >
                                        <i *ngIf="menuTheme === theme.name" class="pi pi-check text-lg" [ngClass]="{ 'text-white': menuTheme !== 'light' }"></i>
                                    </button>
                                }
                            </div>
                        </ng-template>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span class="text-lg font-semibold">Topbar Themes</span>
                        <div class="pt-2 flex gap-2 flex-wrap">
                            @for (theme of topbarThemes; track theme) {
                                <button
                                    type="button"
                                    class="cursor-pointer w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center p-0 outline-none outline-offset-1 shadow"
                                    (click)="changeTopbarTheme(theme.name)"
                                    [ngStyle]="{ 'background-color': theme.color }"
                                >
                                    <i *ngIf="topbarTheme === theme.name" class="pi pi-check text-lg" [ngClass]="{ 'text-white': topbarTheme !== 'light' }"></i>
                                </button>
                            }
                        </div>
                    </div>
                </ng-container>
            </div>
        </p-drawer>
    `
})
export class AppConfigurator {
    @Input({ transform: booleanAttribute }) simple: boolean = false;

    router = inject(Router);

    config: PrimeNG = inject(PrimeNG);

    layoutService: LayoutService = inject(LayoutService);

    primeng = inject(PrimeNG);

    themeOptions = [
        { name: 'Light', value: false },
        { name: 'Dark', value: true }
    ];

    menuThemes = [
        { name: 'light', color: '#FDFEFF' },
        { name: 'dark', color: '#434B54' },
        { name: 'indigo', color: '#1A237E' },
        { name: 'bluegrey', color: '#37474F' },
        { name: 'brown', color: '#4E342E' },
        { name: 'cyan', color: '#006064' },
        { name: 'green', color: '#2E7D32' },
        { name: 'deeppurple', color: '#4527A0' },
        { name: 'deeporange', color: '#BF360C' },
		{ name: 'red', color: '#d80b0b' },
        { name: 'pink', color: '#880E4F' },
        { name: 'purple', color: '#6A1B9A' },
        { name: 'teal', color: '#00695C' }
    ];

    topbarThemes = [
        { name: 'lightblue', color: '#2E88FF' },
        { name: 'dark', color: '#363636' },
        { name: 'white', color: '#FDFEFF' },
        { name: 'blue', color: '#1565C0' },
        { name: 'deeppurple', color: '#4527A0' },
        { name: 'purple', color: '#6A1B9A' },
        { name: 'pink', color: '#AD1457' },
        { name: 'cyan', color: '#0097A7' },
        { name: 'teal', color: '#00796B' },
        { name: 'green', color: '#43A047' },
        { name: 'lightgreen', color: '#689F38' },
        { name: 'lime', color: '#AFB42B' },
        { name: 'yellow', color: '#FBC02D' },
        { name: 'amber', color: '#FFA000' },
        { name: 'orange', color: '#FB8C00' },
        { name: 'deeporange', color: '#D84315' },
		{ name: 'red', color: '#d80b0b' },
        { name: 'brown', color: '#5D4037' },
        { name: 'grey', color: '#616161' },
        { name: 'bluegrey', color: '#546E7A' },
        { name: 'indigo', color: '#3F51B5' }
    ];

    surfaces: SurfacesType[] = [
        {
            name: 'slate',
            palette: {
                0: '#ffffff',
                50: '#f8fafc',
                100: '#f1f5f9',
                200: '#e2e8f0',
                300: '#cbd5e1',
                400: '#94a3b8',
                500: '#64748b',
                600: '#475569',
                700: '#334155',
                800: '#1e293b',
                900: '#0f172a',
                950: '#020617'
            }
        },
        {
            name: 'gray',
            palette: {
                0: '#ffffff',
                50: '#f9fafb',
                100: '#f3f4f6',
                200: '#e5e7eb',
                300: '#d1d5db',
                400: '#9ca3af',
                500: '#6b7280',
                600: '#4b5563',
                700: '#374151',
                800: '#1f2937',
                900: '#111827',
                950: '#030712'
            }
        },
        {
            name: 'zinc',
            palette: {
                0: '#ffffff',
                50: '#fafafa',
                100: '#f4f4f5',
                200: '#e4e4e7',
                300: '#d4d4d8',
                400: '#a1a1aa',
                500: '#71717a',
                600: '#52525b',
                700: '#3f3f46',
                800: '#27272a',
                900: '#18181b',
                950: '#09090b'
            }
        },
        {
            name: 'neutral',
            palette: {
                0: '#ffffff',
                50: '#fafafa',
                100: '#f5f5f5',
                200: '#e5e5e5',
                300: '#d4d4d4',
                400: '#a3a3a3',
                500: '#737373',
                600: '#525252',
                700: '#404040',
                800: '#262626',
                900: '#171717',
                950: '#0a0a0a'
            }
        },
        {
            name: 'stone',
            palette: {
                0: '#ffffff',
                50: '#fafaf9',
                100: '#f5f5f4',
                200: '#e7e5e4',
                300: '#d6d3d1',
                400: '#a8a29e',
                500: '#78716c',
                600: '#57534e',
                700: '#44403c',
                800: '#292524',
                900: '#1c1917',
                950: '#0c0a09'
            }
        },
        {
            name: 'soho',
            palette: {
                0: '#ffffff',
                50: '#ececec',
                100: '#dedfdf',
                200: '#c4c4c6',
                300: '#adaeb0',
                400: '#97979b',
                500: '#7f8084',
                600: '#6a6b70',
                700: '#55565b',
                800: '#3f4046',
                900: '#2c2c34',
                950: '#16161d'
            }
        },
        {
            name: 'viva',
            palette: {
                0: '#ffffff',
                50: '#f3f3f3',
                100: '#e7e7e8',
                200: '#cfd0d0',
                300: '#b7b8b9',
                400: '#9fa1a1',
                500: '#87898a',
                600: '#6e7173',
                700: '#565a5b',
                800: '#3e4244',
                900: '#262b2c',
                950: '#0e1315'
            }
        },
        {
            name: 'ocean',
            palette: {
                0: '#ffffff',
                50: '#fbfcfc',
                100: '#F7F9F8',
                200: '#EFF3F2',
                300: '#DADEDD',
                400: '#B1B7B6',
                500: '#828787',
                600: '#5F7274',
                700: '#415B61',
                800: '#29444E',
                900: '#183240',
                950: '#0c1920'
            }
        }
    ];

    selectedPrimaryColor = computed(() => {
        return this.layoutService.layoutConfig().primary;
    });

    get menuMode() {
        return this.layoutService.layoutConfig().menuMode;
    }

    set menuMode(val: MenuMode) {
        this.layoutService.layoutConfig.update((config) => ({
            ...config,
            menuMode: val
        }));
    }

    get menuTheme(): string {
        return this.layoutService.layoutConfig().menuTheme;
    }

    set menuTheme(val: string) {
        this.layoutService.layoutConfig.update((config) => ({
            ...config,
            menuTheme: val
        }));
    }

    get topbarTheme(): string {
        return this.layoutService.layoutConfig().topbarTheme;
    }

    set topbarTheme(val: string) {
        this.layoutService.layoutConfig.update((config) => ({
            ...config,
            topbarTheme: val
        }));
    }

    get menuProfilePosition() {
        return this.layoutService.layoutConfig().menuProfilePosition;
    }

    set menuProfilePosition(val: string) {
        this.layoutService.layoutConfig.update((config) => ({
            ...config,
            menuProfilePosition: val
        }));
    }

    get darkTheme(): boolean {
        return this.layoutService.layoutConfig().darkTheme;
    }

    set darkTheme(_val: boolean) {
        this.layoutService.layoutConfig.update((config) => ({
            ...config,
            menuTheme: _val ? 'dark' : 'light',
            darkTheme: _val
        }));
    }

    get visible() {
        return this.layoutService.layoutState().configSidebarVisible;
    }

    set visible(val: boolean) {
        this.layoutService.layoutState.update((state) => ({
            ...state,
            configSidebarVisible: val
        }));
    }

    isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

    selectedSurface = computed(() => this.layoutService.layoutConfig().surface);

    primaryColors = computed<SurfacesType[]>(() => {
        const presetPalette = Material.primitive;
        const colors = ['emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red'];
        const palettes: SurfacesType[] = [{ name: 'noir', palette: {} }];

        colors.forEach((color) => {
            palettes.push({
                name: color,
                palette: presetPalette?.[color as KeyOfType<typeof presetPalette>] as SurfacesType['palette']
            });
        });

        return palettes;
    });

    onLayoutThemeChange(theme: string) {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            layoutTheme: theme
        }));
    }

    getPresetExt() {
        const color: SurfacesType = this.primaryColors().find((c) => c.name === this.selectedPrimaryColor()) || {};

        if (color.name === 'noir') {
            return {
                semantic: {
                    primary: {
                        50: '{surface.50}',
                        100: '{surface.100}',
                        200: '{surface.200}',
                        300: '{surface.300}',
                        400: '{surface.400}',
                        500: '{surface.500}',
                        600: '{surface.600}',
                        700: '{surface.700}',
                        800: '{surface.800}',
                        900: '{surface.900}',
                        950: '{surface.950}'
                    },
                    colorScheme: {
                        light: {
                            primary: {
                                color: '{primary.950}',
                                contrastColor: '#ffffff',
                                hoverColor: '{primary.800}',
                                activeColor: '{primary.700}'
                            },
                            highlight: {
                                background: '{primary.950}',
                                focusBackground: '{primary.700}',
                                color: '#ffffff',
                                focusColor: '#ffffff'
                            }
                        },
                        dark: {
                            primary: {
                                color: '{primary.50}',
                                contrastColor: '{primary.950}',
                                hoverColor: '{primary.200}',
                                activeColor: '{primary.300}'
                            },
                            highlight: {
                                background: '{primary.50}',
                                focusBackground: '{primary.300}',
                                color: '{primary.950}',
                                focusColor: '{primary.950}'
                            }
                        }
                    }
                }
            };
        } else {
            return {
                semantic: {
                    primary: color.palette,
                    colorScheme: {
                        light: {
                            primary: {
                                color: '{primary.500}',
                                contrastColor: '#ffffff',
                                hoverColor: '{primary.600}',
                                activeColor: '{primary.700}'
                            },
                            highlight: {
                                background: '{primary.50}',
                                focusBackground: '{primary.100}',
                                color: '{primary.700}',
                                focusColor: '{primary.800}'
                            }
                        },
                        dark: {
                            primary: {
                                color: '{primary.400}',
                                contrastColor: '{surface.900}',
                                hoverColor: '{primary.300}',
                                activeColor: '{primary.200}'
                            },
                            highlight: {
                                background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
                                focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
                                color: 'rgba(255,255,255,.87)',
                                focusColor: 'rgba(255,255,255,.87)'
                            }
                        }
                    }
                }
            };
        }
    }

    updateColors(event: any, type: string, color: any) {
        if (type === 'primary') {
            this.layoutService.layoutConfig.update((state) => ({
                ...state,
                primary: color.name
            }));
        } else if (type === 'surface') {
            this.layoutService.layoutConfig.update((state) => ({
                ...state,
                surface: color.name
            }));
        }
        this.applyTheme(type, color);

        event.stopPropagation();
    }

    applyTheme(type: string, color: any) {
        if (type === 'primary') {
            updatePreset(this.getPresetExt());
        } else if (type === 'surface') {
            updateSurfacePalette(color.palette);
        }
    }

    changeMenuTheme(theme: string) {
        this.menuTheme = theme;
    }

    changeTopbarTheme(theme: string) {
        this.topbarTheme = theme;
    }

    toggleConfigSidebar() {
        this.layoutService.layoutState.update((val) => ({ ...val, configSidebarVisible: !val.configSidebarVisible }));
    }
}
