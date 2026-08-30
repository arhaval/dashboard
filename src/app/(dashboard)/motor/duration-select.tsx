'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DURATION_OPTIONS } from './engine.constants';

const PRESETS: readonly string[] = DURATION_OPTIONS;

/**
 * Target-duration picker: preset choices + "Özel" free text.
 * Works uncontrolled inside a <form> (pass `name`, emits a hidden input) and
 * controlled in the editor (pass `value` + `onChange`).
 */
export function DurationSelect({
  name,
  value,
  onChange,
  required,
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  const initialPreset = value && PRESETS.includes(value) ? value : value ? 'custom' : '';
  const [sel, setSel] = React.useState(initialPreset);
  const [custom, setCustom] = React.useState(value && !PRESETS.includes(value) ? value : '');

  const effective = sel === 'custom' ? custom : sel;

  function pick(next: string) {
    setSel(next);
    onChange?.(next === 'custom' ? custom : next);
  }
  function setCustomVal(next: string) {
    setCustom(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-1.5">
      <Select value={sel} onChange={(e) => pick(e.target.value)} required={required}>
        <option value="">—</option>
        {PRESETS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value="custom">Özel…</option>
      </Select>
      {sel === 'custom' && (
        <Input value={custom} onChange={(e) => setCustomVal(e.target.value)} placeholder="ör. 3 dk" />
      )}
      {name && <input type="hidden" name={name} value={effective} />}
    </div>
  );
}
