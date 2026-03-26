import { theme } from '@/theme';
import { Button, type ButtonProps } from '../Button/Button';
import { CtaType } from './types/Cta';

type CTAProps = { cta: CtaType | CtaType[] };

function appearanceFor(filled: boolean) {
  return {
    fillColor: filled ? theme.colors.secondary.background[100] : 'none',
    strokeColor: filled ? 'none' : theme.colors.primary.text[100],
    textColor: filled
      ? theme.colors.secondary.text[100]
      : theme.colors.primary.text[100],
  };
}

function ctaToButtonProps(item: CtaType): ButtonProps {
  const appearance = appearanceFor(item.filled);

  switch (item.type) {
    case 'link':
      return {
        type: 'link',
        href: item.href,
        external: item.external,
        label: item.label,
        ...appearance,
      };
    case 'submit':
      return { type: 'submit', label: item.label, ...appearance };
    case 'button':
      return { type: 'button', label: item.label, ...appearance };
  }
}

export function CTA({ cta }: CTAProps) {
  return (
    <>
      {Array.isArray(cta) ? (
        cta.map((item) => (
          <Button key={item.label} {...ctaToButtonProps(item)} />
        ))
      ) : (
        <Button {...ctaToButtonProps(cta)} />
      )}
    </>
  );
}
