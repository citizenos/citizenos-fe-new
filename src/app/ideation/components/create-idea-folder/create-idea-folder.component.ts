import { TopicIdeaService } from '@services/topic-idea.service';
import { Component, Inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { map, take } from 'rxjs';
import { Idea } from 'src/app/interfaces/idea';
import { DIALOG_DATA, DialogRef } from 'src/app/shared/dialog';
import { TopicIdeationFoldersService } from '@services/topic-ideation-folders.service';

@Component({
  selector: 'app-create-idea-folder',
  templateUrl: './create-idea-folder.component.html',
  styleUrls: ['./create-idea-folder.component.scss']
})
export class CreateIdeaFolderComponent {
  form = new UntypedFormGroup({
    name: new UntypedFormControl('', Validators.required),
  });

  ideas$;
  allIdeas$ = <Idea[]>[];
  wWidth = window.innerWidth;
  folderIdeas = <Idea[]>[];
  ideasCount = 0;
  topicId;
  ideationId;
  constructor(public TopicIdeaService: TopicIdeaService, public TopicIdeationFoldersService: TopicIdeationFoldersService, @Inject(DIALOG_DATA) data: any, private dialogRef: DialogRef<CreateIdeaFolderComponent>) {
    this.topicId = data.topicId;
    this.ideationId = data.ideationId;
    this.TopicIdeaService.page$.next(1);
    this.ideas$ = this.TopicIdeaService.loadItems().pipe(
      map(
        (newIdeas: any) => {
          this.allIdeas$ = this.allIdeas$.concat(newIdeas);
          if (newIdeas.length > 0) {
            this.TopicIdeaService.loadMore();
          }
          return this.allIdeas$;
        }
      ));
  }
  createFolder() {
    this.TopicIdeationFoldersService.save({ topicId: this.topicId, ideationId: this.ideationId }, this.form.value).pipe(take(1)).subscribe({
      next: (folder) => {
        if (this.folderIdeas.length) {
          this.TopicIdeationFoldersService.addIdea({ topicId: this.topicId, ideationId: this.ideationId, folderId: folder.id }, this.folderIdeas)
            .pipe(take(1))
            .subscribe({
              next: (res) => {
                this.dialogRef.close();
              },
              error: (err) => {
                console.log('Error adding ideas to folder')
              }
            })
        } else {

          this.dialogRef.close();
        }
      },
      error: (err) => {
        console.log('ERROR', err)
      }
    })
  }

  ideaSelected(idea: Idea) {
    const exists = this.folderIdeas.find((item) => item.id === idea.id);
    if (exists) return true;
    return false;
  }

  toggleIdea(idea: Idea, $event: any) {
    $event.stopPropagation();
    const index = this.folderIdeas.findIndex((item) => item.id === idea.id);
    if (index === -1) {
      this.folderIdeas.push(idea);
    } else {
      this.folderIdeas.splice(index, 1);
    }
  }

  toggleAllIdeas(ideas: Idea[]) {
    const allChecked = this.folderIdeas.length === ideas.length;
    if (!allChecked) {
      ideas.forEach((idea) => {
        const index = this.folderIdeas.findIndex((item) => item.id === idea.id);
        if (index === -1) this.folderIdeas.push(idea);
      });
    } else {
      this.folderIdeas = [];
    }
  }

  allChecked() {
    return this.folderIdeas.length === this.ideasCount;
  }
}
