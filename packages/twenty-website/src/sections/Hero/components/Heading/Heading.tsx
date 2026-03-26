import {
  Heading as BaseHeading,
  type HeadingProps,
} from "@/design-system/components/Heading/Heading";
import { theme } from "@/theme";
import { css } from "@linaria/core";

const heroHeadingClassName = css`
  width: 360px;
  word-wrap: break-word;

  @media (min-width: ${theme.breakpoints.md}px) {
    width: 672px;
  }
`;

export function Heading({
  size = "lg",
  weight = "light",
  ...props
}: HeadingProps) {

  return (
    <BaseHeading
      className={heroHeadingClassName}
      size={size}
      weight={weight}
      {...props}
    />
  );
}
