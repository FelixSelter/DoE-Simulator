import { Bounce, Id as ToastId, ToastOptions, toast } from "react-toastify";

class Toast {
  protected id: ToastId;
  protected msg: string;
  protected options: ToastOptions;

  private createToast() {
    this.id = toast(this.msg, this.options);
    return this.id;
  }

  constructor(msg: string, options: ToastOptions) {
    this.msg = msg;
    this.options = options;
    this.id = this.createToast();
  }

  setMsg(msg: string) {
    this.msg = msg;
    toast.update(this.id, {
      render: msg,
    });
  }

  recreate() {
    this.createToast();
  }

  isVisible() {
    return toast.isActive(this.id);
  }

  show() {
    if (this.isVisible()) return;
    this.clear();
    this.recreate();
  }

  clear() {
    toast.dismiss(this.id);
  }
}

export enum ErrorMsgKeys {
  TransformFormulaInvalid,
  UnknownSymbolsInsideRetransformFormula,
  RetransformFormulaInvalid,
  UnknownNoiseType,
  UnknownDeviationType,
  NoTransformFormula,
  NoRetransformFormula,
}
type ErrorMsgKey = ErrorMsgKeys | string;

export class ErrorMsg extends Toast {
  private static errors: Map<ErrorMsgKey, ErrorMsg> = new Map();

  private key: ErrorMsgKey;

  private constructor(key: ErrorMsgKey, msg: string) {
    super(msg, {
      type: "error",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      transition: Bounce,
      // closeButton: false,
    });
    this.key = key;

    ErrorMsg.errors.set(key, this);
  }

  static setError(key: ErrorMsgKey, msg: string, isErrorState: boolean = true) {
    const error = ErrorMsg.errors.get(key);
    if (error !== undefined) {
      if (isErrorState) {
        error.setMsg(msg);
        error.show();
      } else ErrorMsg.clearError(key);
      return error;
    } else {
      return isErrorState ? new ErrorMsg(key, msg) : null;
    }
  }

  static clearError(key: ErrorMsgKey) {
    const error = ErrorMsg.errors.get(key);
    if (error !== undefined) {
      error.clear();
      ErrorMsg.errors.delete(key);
    }
  }

  static isInErrorState() {
    for (const error of ErrorMsg.errors.values()) error.show();
    return ErrorMsg.errors.size > 0;
  }
}

export class FailureMsg extends Toast {
  constructor(msg: string) {
    super(msg, {
      type: "warning",
      autoClose: 5000,
      closeOnClick: false,
      draggable: false,
      transition: Bounce,
    });
  }
}

export class ProgressInfo extends Toast {
  constructor(msg: string) {
    super(msg, { type: "info" });
  }

  setProgress(progress: number) {
    console.assert(progress >= 0 && progress <= 1);
    toast.update(this.id, {
      progress,
      render: this.msg,
    });
  }
}
