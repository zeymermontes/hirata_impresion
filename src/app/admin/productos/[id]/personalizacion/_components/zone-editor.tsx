"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save, Trash2, MousePointer2, RectangleHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TemplateUpload } from "@/app/admin/productos/[id]/personalizacion/_components/template-upload";
import {
  saveTemplateConfigAction,
  clearTemplateConfigAction,
  type TemplateActionState,
} from "@/app/admin/productos/actions";
import type {
  CustomField,
  TemplateConfig,
  Zone,
} from "@/lib/customization";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  fields: CustomField[];
  initial: TemplateConfig | null;
};

const MAX_DISPLAY_WIDTH = 800;

type DragState =
  | { kind: "idle" }
  | { kind: "creating"; startX: number; startY: number; endX: number; endY: number }
  | { kind: "moving"; zoneIdx: number; offsetX: number; offsetY: number };

export function ZoneEditor({ productId, fields, initial }: Props) {
  const [template, setTemplate] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(
    initial
      ? { url: initial.template_url, width: initial.canvas_width, height: initial.canvas_height }
      : null,
  );
  const [zones, setZones] = useState<Zone[]>(initial?.zones ?? []);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const canvasRef = useRef<HTMLDivElement>(null);

  const saveAction = saveTemplateConfigAction.bind(null, productId);
  const [state, formAction] = useActionState<
    TemplateActionState | undefined,
    FormData
  >(saveAction, undefined);

  if (!template) {
    return (
      <TemplateUpload
        onUpload={(t) => {
          setTemplate(t);
          setZones([]);
          setSelectedIdx(null);
        }}
      />
    );
  }

  const scale = Math.min(MAX_DISPLAY_WIDTH, template.width) / template.width;
  const displayW = template.width * scale;
  const displayH = template.height * scale;

  function screenToNative(e: React.MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return; // ignore clicks on zone children
    const { x, y } = screenToNative(e);
    setSelectedIdx(null);
    setDrag({ kind: "creating", startX: x, startY: y, endX: x, endY: y });
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (drag.kind === "idle") return;
    const { x, y } = screenToNative(e);
    if (drag.kind === "creating") {
      setDrag({ ...drag, endX: x, endY: y });
    } else if (drag.kind === "moving") {
      const z = zones[drag.zoneIdx];
      if (!z) return;
      const newX = clamp(x - drag.offsetX, 0, template!.width - z.width);
      const newY = clamp(y - drag.offsetY, 0, template!.height - z.height);
      setZones((prev) =>
        prev.map((zone, i) =>
          i === drag.zoneIdx ? { ...zone, x: newX, y: newY } : zone,
        ),
      );
    }
  }

  function onCanvasMouseUp() {
    if (drag.kind === "creating") {
      const w = Math.abs(drag.endX - drag.startX);
      const h = Math.abs(drag.endY - drag.startY);
      if (w > 20 && h > 10) {
        const newZone: Zone = {
          field: fields[0]?.name ?? "",
          x: Math.min(drag.startX, drag.endX),
          y: Math.min(drag.startY, drag.endY),
          width: w,
          height: h,
          font_size: Math.max(16, Math.round(h * 0.6)),
          color: "#000000",
          align: "center",
        };
        setZones((prev) => [...prev, newZone]);
        setSelectedIdx(zones.length);
      }
    }
    setDrag({ kind: "idle" });
  }

  function onZoneMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    const { x, y } = screenToNative(e);
    const z = zones[idx];
    setSelectedIdx(idx);
    setDrag({
      kind: "moving",
      zoneIdx: idx,
      offsetX: x - z.x,
      offsetY: y - z.y,
    });
  }

  function updateZone(idx: number, patch: Partial<Zone>) {
    setZones((prev) => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
  }

  function deleteZone(idx: number) {
    setZones((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  }

  const selectedZone = selectedIdx !== null ? zones[selectedIdx] : null;
  const previewZone = drag.kind === "creating"
    ? {
        x: Math.min(drag.startX, drag.endX),
        y: Math.min(drag.startY, drag.endY),
        width: Math.abs(drag.endX - drag.startX),
        height: Math.abs(drag.endY - drag.startY),
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointer2 className="h-3.5 w-3.5" />
            Arrastra sobre la plantilla para crear una zona. Click sobre una
            zona para seleccionarla y moverla.
          </p>
          <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            className="relative select-none overflow-hidden rounded-md border border-border bg-muted"
            style={{ width: displayW, height: displayH, cursor: drag.kind === "creating" ? "crosshair" : "default" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            {zones.map((z, i) => (
              <ZoneOverlay
                key={i}
                zone={z}
                scale={scale}
                selected={i === selectedIdx}
                field={fields.find((f) => f.name === z.field)}
                onMouseDown={(e) => onZoneMouseDown(e, i)}
              />
            ))}
            {previewZone ? (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: previewZone.x * scale,
                  top: previewZone.y * scale,
                  width: previewZone.width * scale,
                  height: previewZone.height * scale,
                }}
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Plantilla: {template.width}×{template.height}px · {zones.length} zona{zones.length === 1 ? "" : "s"}
          </p>
        </div>

        <aside className="space-y-4">
          {selectedZone ? (
            <ZoneProperties
              zone={selectedZone}
              fields={fields}
              onChange={(patch) => updateZone(selectedIdx!, patch)}
              onDelete={() => deleteZone(selectedIdx!)}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Selecciona una zona para editar sus propiedades, o dibuja una
              nueva en la plantilla.
            </div>
          )}

          <form action={async () => {
            await clearTemplateConfigAction(productId);
            setTemplate(null);
            setZones([]);
            setSelectedIdx(null);
          }}>
            <button
              type="submit"
              className="text-xs text-destructive hover:underline"
              onClick={(e) => {
                if (!confirm("¿Quitar la plantilla y empezar de nuevo? Las zonas se perderán.")) {
                  e.preventDefault();
                }
              }}
            >
              Quitar plantilla
            </button>
          </form>
        </aside>
      </div>

      <form action={formAction}>
        <input
          type="hidden"
          name="template_config"
          value={JSON.stringify({
            template_url: template.url,
            canvas_width: template.width,
            canvas_height: template.height,
            zones,
          } satisfies TemplateConfig)}
        />
        {state?.message ? (
          <p
            className={cn(
              "mb-3 rounded-md p-3 text-sm",
              state.ok
                ? "bg-emerald-100 text-emerald-900"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {state.message}
          </p>
        ) : null}
        <SaveButton hasFields={fields.length > 0} hasZones={zones.length > 0} />
      </form>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ZoneOverlay({
  zone,
  scale,
  selected,
  field,
  onMouseDown,
}: {
  zone: Zone;
  scale: number;
  selected: boolean;
  field: CustomField | undefined;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "absolute flex cursor-move items-center justify-center border-2 text-[10px] font-mono uppercase tracking-wide",
        selected
          ? "border-primary bg-primary/15"
          : "border-secondary/60 bg-secondary/10 hover:bg-secondary/20",
      )}
      style={{
        left: zone.x * scale,
        top: zone.y * scale,
        width: zone.width * scale,
        height: zone.height * scale,
      }}
    >
      <span className="rounded bg-background/90 px-1 py-0.5 text-foreground">
        {field?.label ?? zone.field ?? "(sin campo)"}
      </span>
    </div>
  );
}

function ZoneProperties({
  zone,
  fields,
  onChange,
  onDelete,
}: {
  zone: Zone;
  fields: CustomField[];
  onChange: (patch: Partial<Zone>) => void;
  onDelete: () => void;
}) {
  const selectedField = fields.find((f) => f.name === zone.field);
  const isText =
    !selectedField ||
    selectedField.type === "text" ||
    selectedField.type === "textarea" ||
    selectedField.type === "number" ||
    selectedField.type === "dropdown";

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <RectangleHorizontal className="h-4 w-4 text-primary" />
        Propiedades de la zona
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="zone-field" className="text-xs">
          Campo
        </Label>
        <Select
          id="zone-field"
          value={zone.field}
          onChange={(e) => onChange({ field: e.target.value })}
        >
          <option value="">— elegir campo —</option>
          {fields.map((f) => (
            <option key={f.id} value={f.name}>
              {f.label} ({f.type})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="X" value={Math.round(zone.x)} onChange={(v) => onChange({ x: v })} />
        <NumberInput label="Y" value={Math.round(zone.y)} onChange={(v) => onChange({ y: v })} />
        <NumberInput label="Ancho" value={Math.round(zone.width)} onChange={(v) => onChange({ width: Math.max(10, v) })} />
        <NumberInput label="Alto" value={Math.round(zone.height)} onChange={(v) => onChange({ height: Math.max(10, v) })} />
      </div>

      {isText ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="Tamaño fuente"
              value={zone.font_size ?? 32}
              onChange={(v) => onChange({ font_size: Math.max(8, v) })}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="zone-color" className="text-xs">
                Color
              </Label>
              <input
                id="zone-color"
                type="color"
                value={zone.color ?? "#000000"}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="zone-align" className="text-xs">
              Alineación
            </Label>
            <Select
              id="zone-align"
              value={zone.align ?? "center"}
              onChange={(e) =>
                onChange({ align: e.target.value as "left" | "center" | "right" })
              }
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </Select>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar zona
      </button>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function SaveButton({
  hasFields,
  hasZones,
}: {
  hasFields: boolean;
  hasZones: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !hasFields} className="gap-2">
      <Save className="h-4 w-4" />
      {pending
        ? "Guardando..."
        : hasZones
          ? "Guardar plantilla y zonas"
          : !hasFields
            ? "Crea primero campos de personalización"
            : "Guardar plantilla (sin zonas todavía)"}
    </Button>
  );
}
