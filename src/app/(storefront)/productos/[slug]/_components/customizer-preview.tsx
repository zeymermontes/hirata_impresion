"use client";

import { useEffect, useRef, useState } from "react";
import type { CustomField, TemplateConfig, Zone } from "@/lib/customization";
import { cn } from "@/lib/utils";

type Props = {
  template: TemplateConfig;
  fields: CustomField[];
  values: Record<string, string>;
  uploads: Record<string, string>;
  className?: string;
};

/**
 * Renders the template image with each zone overlaid in real time. Coordinates
 * are stored in native pixels; we scale to the container width.
 */
export function CustomizerPreview({
  template,
  fields,
  values,
  uploads,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / template.canvas_width : 0;
  const displayHeight = template.canvas_height * scale;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border bg-muted",
        className,
      )}
      style={{ height: displayHeight || undefined, aspectRatio: scale === 0 ? `${template.canvas_width} / ${template.canvas_height}` : undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={template.template_url}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
      {template.zones.map((z, i) => (
        <ZoneLayer
          key={i}
          zone={z}
          scale={scale}
          field={fields.find((f) => f.name === z.field)}
          value={values[z.field]}
          uploadUrl={uploads[z.field]}
        />
      ))}
    </div>
  );
}

function ZoneLayer({
  zone,
  scale,
  field,
  value,
  uploadUrl,
}: {
  zone: Zone;
  scale: number;
  field: CustomField | undefined;
  value: string | undefined;
  uploadUrl: string | undefined;
}) {
  if (scale <= 0) return null;

  const style: React.CSSProperties = {
    position: "absolute",
    left: zone.x * scale,
    top: zone.y * scale,
    width: zone.width * scale,
    height: zone.height * scale,
  };

  if (field?.type === "file") {
    if (!uploadUrl) {
      return (
        <div
          style={style}
          className="grid place-items-center border border-dashed border-foreground/30 bg-background/40 text-[10px] text-muted-foreground"
        >
          {field.label}
        </div>
      );
    }
    return (
      <div style={style} className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uploadUrl}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    );
  }

  const text = value && value.length > 0 ? value : "";
  const fontSize = (zone.font_size ?? 32) * scale;

  return (
    <div
      style={{
        ...style,
        color: zone.color ?? "#000000",
        fontSize: `${fontSize}px`,
        fontFamily: zone.font_family ?? "inherit",
        fontWeight: zone.font_weight ?? "normal",
        textAlign: zone.align ?? "center",
        lineHeight: 1.1,
        display: "flex",
        alignItems: "center",
        justifyContent:
          zone.align === "left"
            ? "flex-start"
            : zone.align === "right"
              ? "flex-end"
              : "center",
        overflow: "hidden",
      }}
    >
      <span className="block w-full truncate">{text}</span>
    </div>
  );
}
