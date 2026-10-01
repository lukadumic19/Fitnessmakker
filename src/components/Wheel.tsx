import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

export interface WheelOption<T> {
  value: T;
  label: string;
}

/**
 * A scroll-snapping picker wheel. Item height and visible rows come from CSS
 * (--wheel-item, --wheel-rows), so the same wheel adapts to where it is placed.
 */
export function Wheel<T>({
  options,
  value,
  onChange,
  label,
  dim,
}: {
  options: WheelOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Show the wheel as "not set" (value is only a starting point). */
  dim?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [live, setLive] = useState(index);
  const settleTimer = useRef<number>(0);
  const userScrolling = useRef(false);
  const drag = useRef<{ y: number; top: number } | null>(null);
  const ignoreScroll = useRef(false);

  const itemH = () => (ref.current?.querySelector('.wheel-item') as HTMLElement | null)?.offsetHeight || 36;

  // Keep the scroll position in sync when the value changes from outside.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || userScrolling.current) return;
    const top = index * itemH();
    if (Math.abs(el.scrollTop - top) > 1) {
      // Programmatic positioning must not be mistaken for the user picking a value.
      ignoreScroll.current = true;
      el.scrollTop = top;
    }
    setLive(index);
  }, [index, options.length]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const commit = (i: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, i));
    if (clamped !== index || dim) onChange(options[clamped].value);
  };

  const settle = () => {
    const el = ref.current;
    if (!el || drag.current) return;
    const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / itemH())));
    userScrolling.current = false;
    el.scrollTo({ top: i * itemH(), behavior: 'smooth' });
    commit(i);
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (ignoreScroll.current) {
      ignoreScroll.current = false;
      return;
    }
    userScrolling.current = true;
    const i = Math.round(el.scrollTop / itemH());
    if (i !== live) setLive(Math.max(0, Math.min(options.length - 1, i)));
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 110);
  };

  const scrollToIndex = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(options.length - 1, i));
    el.scrollTo({ top: clamped * itemH(), behavior: 'smooth' });
    // Clicking the current item still commits (useful when the wheel is dimmed).
    if (clamped === live) commit(clamped);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
    if (step != null) {
      e.preventDefault();
      scrollToIndex(live + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      scrollToIndex(e.key === 'Home' ? 0 : options.length - 1);
    }
  };

  // Mouse drag (touch and trackpads scroll natively).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return;
    drag.current = { y: e.clientY, top: ref.current.scrollTop };
    ref.current.setPointerCapture(e.pointerId);
    ref.current.classList.add('is-dragging');
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    ref.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    const moved = Math.abs(e.clientY - drag.current.y) > 3;
    drag.current = null;
    ref.current.classList.remove('is-dragging');
    if (moved) settle();
  };

  return (
    <div className={`wheel-wrap ${dim ? 'is-dim' : ''}`}>
      <div
        ref={ref}
        className="wheel"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={typeof value === 'number' ? value : undefined}
        aria-valuetext={dim ? 'Ikke angivet' : options[index]?.label}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {options.map((o, i) => (
          <div
            key={i}
            className={`wheel-item ${i === live ? 'is-sel' : Math.abs(i - live) === 1 ? 'is-near' : ''}`}
            onClick={() => scrollToIndex(i)}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Number wheels                                                       */
/* ------------------------------------------------------------------ */

const fmtFrac = (f: number, fractions: number[]) => {
  const digits = fractions.some((x) => Math.round(x * 100) % 10 !== 0) ? 2 : 1;
  return ',' + Math.round(f * 10 ** digits).toString().padStart(digits, '0');
};

function range(min: number, max: number, step: number) {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export interface NumberWheelProps {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  min: number;
  max: number;
  step?: number;
  /** Decimal parts shown in a second wheel, e.g. [0, 0.5]. */
  fractions?: number[];
  unit?: string;
  /** Where the wheel starts when the value is empty. */
  fallback?: number;
  /** Allow clearing the value (shows a clear button). */
  optional?: boolean;
  format?: (v: number) => string;
  showLabel?: boolean;
}

/** One number, as one wheel (whole numbers) or two (whole + decimal part). */
export function NumberWheel({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  fractions,
  unit,
  fallback,
  optional,
  format,
  showLabel = true,
}: NumberWheelProps) {
  const empty = value == null;
  const shown = value ?? fallback ?? min;
  const whole = fractions ? Math.floor(shown + 1e-9) : shown;
  const fracVals = fractions ?? [0];
  const frac = fractions
    ? fracVals.reduce((best, f) => (Math.abs(shown - whole - f) < Math.abs(shown - whole - best) ? f : best), fracVals[0])
    : 0;

  const wholeOpts = useMemo(
    () =>
      range(min, max, step).map((v) => ({
        value: v,
        label: format ? format(v) : v.toLocaleString('da-DK'),
      })),
    [min, max, step, format],
  );
  const fracOpts = useMemo(
    () => (fractions ?? []).map((f) => ({ value: f, label: fmtFrac(f, fractions!) })),
    [fractions],
  );
  const clampWhole = Math.max(min, Math.min(max, Math.round(whole / step) * step));

  return (
    <div className={`num-wheel ${empty ? 'is-empty' : ''}`}>
      {showLabel && (
        <div className="num-wheel-head">
          <span className="num-wheel-label">{label}</span>
          {optional && !empty && (
            <button type="button" className="num-wheel-clear" onClick={() => onChange(null)} aria-label={`Ryd ${label}`}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      )}
      <div className="num-wheel-row">
        <Wheel
          label={label}
          options={wholeOpts}
          value={clampWhole}
          dim={empty}
          onChange={(w) => onChange(Math.round((w + frac) * 1000) / 1000)}
        />
        {fractions && (
          <Wheel
            label={`${label}, decimaler`}
            options={fracOpts}
            value={frac}
            dim={empty}
            onChange={(f) => onChange(Math.round((clampWhole + f) * 1000) / 1000)}
          />
        )}
        {unit && <span className="num-wheel-unit">{unit}</span>}
      </div>
      {optional && empty && showLabel && <span className="num-wheel-hint">Ikke angivet</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Picker sheet: popover on desktop, bottom sheet on phones            */
/* ------------------------------------------------------------------ */

const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;

export function PickerSheet({
  anchor,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  anchor: HTMLElement | null;
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const narrow = isNarrow();

  useLayoutEffect(() => {
    if (narrow || !anchor || !panel.current) return;
    const r = anchor.getBoundingClientRect();
    const p = panel.current.getBoundingClientRect();
    const margin = 12;
    let top = r.bottom + 8;
    if (top + p.height > window.innerHeight - margin) top = Math.max(margin, r.top - p.height - 8);
    const left = Math.min(Math.max(margin, r.left + r.width / 2 - p.width / 2), window.innerWidth - p.width - margin);
    setPos({ top, left });
  }, [anchor, narrow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus the first wheel so arrow keys work straight away.
  useEffect(() => {
    (panel.current?.querySelector('.wheel') as HTMLElement | null)?.focus({ preventScroll: true });
  }, []);

  return createPortal(
    <div
      className={`sheet-backdrop ${narrow ? 'is-sheet' : 'is-popover'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-label={title}
        style={narrow ? undefined : pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
      >
        <header className="sheet-head">
          <div className="grow">
            <strong>{title}</strong>
            {subtitle && <div className="muted small">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Luk">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Button that looks like an input and shows a picked value. */
export function ValueButton({
  value,
  placeholder,
  onClick,
  label,
  active,
  className,
}: {
  value: string | null;
  placeholder?: string;
  onClick: (el: HTMLElement) => void;
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`value-btn ${value == null ? 'is-placeholder' : ''} ${active ? 'is-active' : ''} ${className ?? ''}`}
      aria-label={`${label}: ${value ?? placeholder ?? 'ikke angivet'}`}
      onClick={(e) => onClick(e.currentTarget)}
    >
      {value ?? placeholder ?? '–'}
    </button>
  );
}
