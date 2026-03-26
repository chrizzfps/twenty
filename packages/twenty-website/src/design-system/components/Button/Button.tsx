import { theme } from "@/theme";
import { styled } from "@linaria/react";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { ButtonShape } from "./ButtonShape";

type ButtonBaseProps = {
  label: string;
  fillColor: string;
  strokeColor: string;
  textColor: string;
  onClick?: () => void;
};

type NativeButtonRest = Omit<
  ComponentPropsWithoutRef<"button">,
  "type" | "children" | keyof ButtonBaseProps
>;

type SubmitButtonProps = ButtonBaseProps &
  NativeButtonRest & {
    type: "submit";
    href?: never;
  };

type ButtonButtonProps = ButtonBaseProps &
  NativeButtonRest & {
    type: "button";
    href?: never;
  };

export type LinkButtonProps = ButtonBaseProps & {
  type: "link";
  href: string;
  /**
   * `true`: render a native `<a>` (off-app or non-Next targets). Opens in a new tab with safe `rel`.
   * `false`: render Next.js `Link` for in-app navigation.
   */
  external: boolean;
};

export type ButtonProps =
  | LinkButtonProps
  | SubmitButtonProps
  | ButtonButtonProps;

const baseStyles = `
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${theme.radius(2)};
  cursor: pointer;
  display: inline-flex;
  font-family: ${theme.font.family.mono};
  font-size: ${theme.font.size(3)};
  font-weight: ${theme.font.weight.medium};
  height: ${theme.spacing(10)};
  justify-content: center;
  letter-spacing: 0;
  padding: 0 ${theme.spacing(5)};
  position: relative;
  text-decoration: none;
  text-transform: uppercase;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }
`;

const Label = styled.span<{ textColor: string }>`
  color: ${(p) => p.textColor};
  position: relative;
  z-index: 1;
`;

const StyledAnchor = styled.a`
  ${baseStyles}
`;

const StyledLink = styled(Link)`
  ${baseStyles}
`;

const StyledNativeButton = styled.button`
  ${baseStyles}
`;

export function Button(props: ButtonProps) {
  const { label, fillColor, strokeColor, textColor, onClick } = props;

  const inner = (
    <>
      <ButtonShape fillColor={fillColor} strokeColor={strokeColor} />
      <Label textColor={textColor}>{label}</Label>
    </>
  );

  if (props.type === "link") {
    if (props.external) {
      return (
        <StyledAnchor
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
        >
          {inner}
        </StyledAnchor>
      );
    }

    return (
      <StyledLink href={props.href} onClick={onClick}>
        {inner}
      </StyledLink>
    );
  }

  const {
    type: nativeType,
    label: _l,
    fillColor: _f,
    strokeColor: _s,
    textColor: _t,
    onClick: _o,
    ...nativeRest
  } = props;

  return (
    <StyledNativeButton
      type={nativeType}
      onClick={onClick}
      {...nativeRest}
    >
      {inner}
    </StyledNativeButton>
  );
}
