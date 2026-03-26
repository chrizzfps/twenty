type CtaAppearance = {
  filled: boolean;
  label: string;
};

export type CtaLinkType = CtaAppearance & {
  type: "link";
  href: string;
  external: boolean;
};

export type CtaSubmitType = CtaAppearance & {
  type: "submit";
};

export type CtaButtonType = CtaAppearance & {
  type: "button";
};

export type CtaType = CtaLinkType | CtaSubmitType | CtaButtonType;
