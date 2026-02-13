import {Component, ElementRef, ViewChild} from '@angular/core';
import {PopoverModule} from 'primeng/popover';
import {InputGroupModule} from 'primeng/inputgroup';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {MenuModule} from 'primeng/menu';
import {InputTextModule} from 'primeng/inputtext';
import {InputGroupAddonModule} from 'primeng/inputgroupaddon';

@Component({
    selector: 'chat-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule, MenuModule, InputTextModule, InputGroupModule, InputGroupAddonModule, PopoverModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-3">
            <h5>Chat</h5>
            <div>
                <button pButton pRipple type="button" icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu [popup]="true" [model]="items"> </p-menu>
            </div>
        </div>
        <div>
            <ul class="chat-container m-0 px-4 pt-4 pb-0 border-0 list-none h-[30rem] overflow-y-auto outline-0" #chatcontainer>
                <li *ngFor="let chartMessage of chatMessages; let last = last" class="flex items-start" [ngClass]="{ from: !!chartMessage.from, 'text-right justify-end': !chartMessage.from, 'mb-3': !last, 'mb-1': last }">
                    <img *ngIf="!!chartMessage.url" [src]="chartMessage.url" alt="avatar" width="32px" class="mr-2" />
                    <div class="flex flex-col" [ngClass]="{ 'items-start': !!chartMessage.from, 'items-end': !chartMessage.from }">
                        <span
                            style="word-break: break-word;"
                            *ngFor="let message of chartMessage.messages; let first = first"
                            class="p-4 rounded-3xl text-white"
                            [ngClass]="{ 'bg-cyan-500': !!chartMessage.from, 'bg-pink-500': !chartMessage.from, 'mt-1': !first }"
                        >
                            {{ message }}
                        </span>
                    </div>
                </li>
            </ul>
            <p-input-group class="mt-4">
                <p-inputgroup-addon>
                    <button pButton pRipple type="button" icon="pi pi-plus-circle" text class="h-full"></button>
                </p-inputgroup-addon>
                <input #chatInput type="text" pInputText placeholder="Write your message (Hint: 'PrimeNG')" (keydown)="onChatKeydown($event)" />
                <p-inputgroup-addon>
                    <button pButton pRipple type="button" icon="pi pi-video" text class="h-full"></button>
                </p-inputgroup-addon>
                <p-inputgroup-addon>
                    <button pButton pRipple type="button" icon="pi pi-clock" (click)="op.toggle($event)" class="h-full"></button>
                    <p-popover #op styleClass="w-[45em]">
                        <button *ngFor="let emoji of chatEmojis" pButton pRipple (click)="op.hide(); onEmojiClick(chatInput, emoji)" type="button" [label]="emoji" class="emoji-button p-2" text></button>
                    </p-popover>
                </p-inputgroup-addon>
            </p-input-group>
        </div>
    </div> `
})
export class ChatWidget {
    @ViewChild('chatcontainer') chatContainerViewChild!: ElementRef;

    items = [
        { label: 'View Media', icon: 'pi pi-fw pi-images' },
        { label: 'Starred Messages', icon: 'pi pi-fw pi-star' },
        { label: 'Search', icon: 'pi pi-fw pi-search' }
    ];

    chatMessages: any[] = [
        {
            from: 'Ioni Bowcher',
            url: '/images/avatar/ionibowcher.png',
            messages: ['Hey M. hope you are well.', 'Our idea is accepted by the board. Now it’s time to execute it']
        },
        { messages: ['We did it! 🤠'] },
        {
            from: 'Ioni Bowcher',
            url: '/images/avatar/ionibowcher.png',
            messages: ["That's really good!"]
        },
        { messages: ['But it’s important to ship MVP ASAP'] },
        {
            from: 'Ioni Bowcher',
            url: '/images/avatar/ionibowcher.png',
            messages: ['I’ll be looking at the process then, just to be sure 🤓']
        },
        { messages: ['That’s awesome. Thanks!'] }
    ];

    chatEmojis: any[] = [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '😂',
        '🤣',
        '😇',
        '😉',
        '😊',
        '🙂',
        '🙃',
        '😋',
        '😌',
        '😍',
        '🥰',
        '😘',
        '😗',
        '😙',
        '😚',
        '🤪',
        '😜',
        '😝',
        '😛',
        '🤑',
        '😎',
        '🤓',
        '🧐',
        '🤠',
        '🥳',
        '🤗',
        '🤡',
        '😏',
        '😶',
        '😐',
        '😑',
        '😒',
        '🙄',
        '🤨',
        '🤔',
        '🤫',
        '🤭',
        '🤥',
        '😳',
        '😞',
        '😟',
        '😠',
        '😡',
        '🤬',
        '😔',
        '😟',
        '😠',
        '😡',
        '🤬',
        '😔',
        '😕',
        '🙁',
        '😬',
        '🥺',
        '😣',
        '😖',
        '😫',
        '😩',
        '🥱',
        '😤',
        '😮',
        '😱',
        '😨',
        '😰',
        '😯',
        '😦',
        '😧',
        '😢',
        '😥',
        '😪',
        '🤤'
    ];

    onEmojiClick(chatInput: any, emoji: string) {
        if (chatInput) {
            chatInput.value += emoji;
            chatInput.focus();
        }
    }

    onChatKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            const message = (<HTMLInputElement>event.currentTarget).value;
            const lastMessage = this.chatMessages[this.chatMessages.length - 1];

            if (lastMessage.from) {
                this.chatMessages.push({ messages: [message] });
            } else {
                lastMessage.messages.push(message);
            }

            if (message.match(/primeng|primereact|primefaces|primevue/i)) {
                this.chatMessages.push({
                    from: 'Ioni Bowcher',
                    url: '/images/avatar/ionibowcher.png',
                    messages: ['Always bet on Prime!']
                });
            }

            (<HTMLInputElement>event.currentTarget).value = '';

            const el = this.chatContainerViewChild.nativeElement;
            setTimeout(() => {
                el.scroll({
                    top: el.scrollHeight,
                    behavior: 'smooth'
                });
            }, 1);
        }
    }
}
