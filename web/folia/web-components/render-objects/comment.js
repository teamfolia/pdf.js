import { v4 as uuid } from "uuid";
import { fromPdfPoint, getInitials, toPdfPoint } from "../../folia-util";
import BaseAnnoObject from "./base";
import { ANNOTATION_TYPES, PERMISSIONS, ROLE_OBJECT, USER_ROLE } from "../../constants";

import FoliaComment from "../folia-comment";
import FoliaReply from "../folia-reply";
import FoliaCreateComment from "../folia-create-comment";

class CommentObject extends BaseAnnoObject {
  lineWidth = 0;
  anchorPoint;
  pointWidth = 36;
  pointHeight = 36;

  submitReplyBinded = this.submitReply.bind(this);
  closeBinded = this.close.bind(this);
  removeBinded = this.remove.bind(this);
  changeReadStatusBinded = this.changeReadStatus.bind(this);
  setAllRepliesAsUnreadBinded = this.setAllRepliesAsUnread.bind(this);
  setAllRepliesAsReadBinded = this.setAllRepliesAsRead.bind(this);

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { anchorPoint, replies } = annoData;
    this.anchorPoint = anchorPoint;
    this.replies = replies;
    this.no_corners = true;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const { anchorPoint = this.anchorPoint, replies = this.replies } = annoData;
      this.anchorPoint = anchorPoint;
      this.replies = replies;

      if (this.commentEl) {
        this.setAllRepliesAsRead();
        this.commentEl.replies = this.replies;
      }
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      anchorPoint: this.anchorPoint,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
    };
  }

  render(ctx) {
    if (!ctx) return;
  }

  renderUI(uiContainer) {
    super.renderUI(uiContainer);

    if (this.annotationUI && !this.annotationUI.querySelector(".user-initials")) {
      const userInitialsEl = document.createElement("div");
      userInitialsEl.className = "user-initials";
      userInitialsEl.setAttribute("id", this.id);
      userInitialsEl.setAttribute("data-role", ROLE_OBJECT);
      userInitialsEl.setAttribute(
        "user-initials",
        getInitials(this.collaboratorName || this.collaboratorEmail)
      );
      this.annotationUI.appendChild(userInitialsEl);
    }

    const hasError = Boolean(this.error) || this.replies.some((reply) => Boolean(reply.error));
    const isUnread = this.userRole !== USER_ROLE.PUBLIC_VIEWER && this.replies.some((reply) => !reply.isRead);
    this.annotationUI.classList.toggle("error", hasError);
    this.annotationUI.classList.toggle("unread", isUnread);
    if (!this.observer) {
      this.observer = new MutationObserver((mutations) => this.commentAnnotationMutaionCallback(mutations));
      this.observer.observe(this.annotationUI, { childList: true });
    }
  }

  getBoundingRect() {
    const anchorPoint = fromPdfPoint(this.anchorPoint, this.viewport.width, this.viewport.height);
    return {
      left: anchorPoint.x,
      top: anchorPoint.y,
      width: this.pointWidth,
      height: this.pointHeight,
      right: anchorPoint.x + this.pointWidth,
      bottom: anchorPoint.y + this.pointHeight,
    };
  }

  makeSelected() {
    super.makeSelected();
    const stepan = document.createElement("span");
    stepan.className = "stepan";
    this.annotationUI.appendChild(stepan);
  }

  makeUnselected() {
    super.makeUnselected();
    this.annotationUI.querySelectorAll("span.stepan").forEach((el) => el.remove());
  }

  move(deltaX = 0, deltaY = 0) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { left, top, width, height, right, bottom } = this.startPosition.bounds;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = (this.lineWidth * this.viewport.scale) / 2;

    annoData.anchorPoint = toPdfPoint(
      {
        x: Math.min(this.viewport.width - (safeArea + width), Math.max(safeArea, left + deltaX)),
        y: Math.min(this.viewport.height - (safeArea + height), Math.max(safeArea, top + deltaY)),
      },
      this.viewport.width,
      this.viewport.height
    );

    this.changeManually(annoData, this.startPosition.objectData);
    this.commentEl?.adjustPosition();
  }

  resize(deltaX, deltaY, corner, useAspectRatio = false) {}

  commentAnnotationMutaionCallback(mutations) {
    // here we observe <selected> class of this.annotationUI
    mutations.forEach((mutation) => {
      if (mutation.target !== this.annotationUI) return;
      const stepanAdded = Array.from(mutation.addedNodes).some((el) => el.classList.contains("stepan"));
      const stepanRemoved = Array.from(mutation.removedNodes).some((el) => el.classList.contains("stepan"));
      if (stepanAdded) {
        // console.log("set replies & permissions here.");
        this.setAllRepliesAsRead();

        this.commentEl = document.createElement("folia-comment");
        this.commentEl.setAttribute("id", this.id);
        this.commentEl.addEventListener("submit-replay", this.submitReplyBinded);
        this.commentEl.addEventListener("close", this.closeBinded);
        this.commentEl.addEventListener("remove", this.removeBinded);
        this.commentEl.addEventListener("change-read-status", this.changeReadStatusBinded);
        this.commentEl.addEventListener("mark-all-as-unread", this.setAllRepliesAsUnreadBinded);
        this.commentEl.addEventListener("mark-all-as-read", this.setAllRepliesAsReadBinded);
        this.commentEl.onmousedown = (e) => e.stopPropagation();

        this.commentEl.currentUserEmail = this.userEmail;
        this.commentEl.collaboratorEmail = this.collaboratorEmail;
        this.commentEl.permissions = this.permissions;
        this.commentEl.userRole = this.userRole;
        this.commentEl.replies = this.replies;
        this.annotationUI.appendChild(this.commentEl);
        //
      } else if (stepanRemoved) {
        // console.log("remove folia-comment");
        if (this.commentEl) {
          this.commentEl.removeEventListener("submit-replay", this.submitReplyBinded);
          this.commentEl.removeEventListener("close", this.closeBinded);
          this.commentEl.removeEventListener("remove", this.removeBinded);
          this.commentEl.removeEventListener("change-read-status", this.changeReadStatusBinded);
          this.commentEl.removeEventListener("mark-all-as-unread", this.setAllRepliesAsUnreadBinded);
          this.commentEl.removeEventListener("mark-all-as-read", this.setAllRepliesAsReadBinded);
          this.commentEl.remove();
          this.commentEl = null;
        }
      }
    });
  }

  submitReply(e) {
    const addedAt = e.detail.addedAt || new Date().toISOString();

    if (!e.detail.id) {
      const id = uuid();
      const annotationData = {
        __typename: ANNOTATION_TYPES.REPLY,
        id,
        addedAt: addedAt,
        createdAt: addedAt,
        collaboratorEmail: this.userEmail,
        collaboratorName: this.userName,
        commentId: this.id,
        page: this.page,
        status: "NOT_EDITED",
        text: e.detail.text,
        isRead: true,
      };
      this.replies = this.replies.concat(annotationData);
      this.commentEl.replies = this.replies;
      this.eventBus.dispatch("objects-were-updated", [annotationData]);
      //
    } else {
      const replyData = this.replies.find((reply) => reply.id === e.detail.id);
      replyData.status = replyData?.edited || e.detail.edited ? "EDITED" : "NOT_EDITED";
      replyData.addedAt = addedAt;
      replyData.text = e.detail.text;
      this.eventBus.dispatch("objects-were-updated", [replyData]);
    }
  }

  close(e) {
    this.eventBus.dispatch("unselect-object", this);
  }

  remove(e) {
    const { commentId, replyId } = e.detail;
    if (commentId) {
      // console.log("remove comment", { commentId, replyId }, this.replies);
      this.changeManually({ deletedAt: new Date().toISOString() });
      this.eventBus.dispatch(
        "objects-were-updated",
        this.replies.map((reply) => {
          return { ...reply, deletedAt: new Date().toISOString() };
        })
      );
    } else if (replyId) {
      const reply = this.replies.find((r) => r.id === replyId);
      reply.deletedAt = new Date().toISOString();
      this.eventBus.dispatch("objects-were-updated", [reply]);
    }
  }

  changeReadStatus(e) {
    const { replyId, isRead } = e.detail;
    const commentId = this.id;
    const addedAt = new Date().toISOString();
    this.eventBus.dispatch("set-replies-read-status", [{ commentId, replyId, isRead, addedAt }]);
    const reply = this.annotationRawData.replies.find((reply) => reply.id === replyId);
    if (reply) reply.isRead = isRead;
  }

  setAllRepliesAsRead() {
    if (this.userRole === USER_ROLE.PUBLIC_VIEWER) return;
    this.changeAllReadStatuses(true);
  }

  setAllRepliesAsUnread() {
    if (this.userRole === USER_ROLE.PUBLIC_VIEWER) return;
    this.changeAllReadStatuses(false);
    if (this.commentEl) {
      this.commentEl.replies = this.replies;
    }
  }

  changeAllReadStatuses(isRead = true) {
    const now = new Date().toISOString();
    const commentId = this.id;
    const statuses = this.replies
      .filter((r) => r.isRead !== isRead)
      .map((r) => ({
        commentId,
        replyId: r.id,
        isRead: isRead,
        addedAt: now,
      }));

    if (statuses.length > 0) {
      this.eventBus.dispatch("set-replies-read-status", statuses);
      this.replies.forEach((reply) => {
        const status = statuses.find((status) => reply.id === status.replyId);
        if (status) {
          reply.isRead = status.isRead;
        }
      });
    }
    // console.log("changeAllReadStatuses as", isRead, this.replies);
  }

  get canManage() {
    const isCommentOwner = this.userEmail === this.collaboratorEmail;
    return isCommentOwner;
  }

  get isEditing() {
    return !!this.commentEl;
  }
}

export default CommentObject;
