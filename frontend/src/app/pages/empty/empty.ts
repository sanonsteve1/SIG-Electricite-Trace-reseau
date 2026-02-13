import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-empty',
    standalone: true,
    template: `<div class="grid grid-cols-12 gap-4">
        <div class="col-span-12">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Empty Page</div>
                <p>Use this page to start from scratch and place your custom content.</p>
            </div>
        </div>
    </div>`
})
export class Empty implements OnInit {
    private audio = new Audio();

    constructor() {
        this.audio.src = 'sons/alerte.mp3'; // Chemin relatif à "src/"
        this.audio.load();
    }

    ngOnInit(): void {
        this.jouerSon();
    }

    jouerSon() {
        console.log(this.audio);
        this.audio.play().catch((error) => {
            console.error('Erreur lors de la lecture du son :', error);
        });
    }
}
