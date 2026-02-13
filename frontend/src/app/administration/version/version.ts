import {Component, OnInit} from '@angular/core';
import {CommitService} from "../../../services/commit.service";
import {Commit} from "../../../models/commit";
import {DatePipe} from "@angular/common";
import {Timeline} from "primeng/timeline";
import {AuthService} from "../../../services/auth.service";
import {LoginPassword} from "../../../models/login-password.model";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [
		DatePipe,
		Timeline
	],
	providers: [AuthService],
	templateUrl: './version.html'
})
export class Version implements OnInit {
	private readonly audio = new Audio();
	commits: Commit[] = [];

	constructor(private readonly commitService: CommitService,
				private readonly authService: AuthService) {
		this.audio.src = 'sons/alerte.mp3';
		this.audio.load();
	}

	ngOnInit(): void {
		// this.jouerSon();
		this.getCommits();
		this.authService.authentifier(new LoginPassword({username: 'abadou', password: 'eburtis2020'})).subscribe()
	}

	jouerSon() {
		console.log(this.audio);
		this.audio.play().catch((error) => {
			console.error('Erreur lors de la lecture du son :', error);
		});
	}

	getCommits(): void {
		this.commitService.getCommits().subscribe(data => {
			this.commits = data;
		});
	}
}
