import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {Commit} from "../models/commit";

@Injectable({
	providedIn: 'root'
})
export class CommitService {
	constructor(private readonly http: HttpClient) {}

	getCommits(): Observable<Commit[]> {
		return this.http.get<Commit[]>('/commits.json');
	}
}
