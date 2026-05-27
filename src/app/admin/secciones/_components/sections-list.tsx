"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SectionForm,
  SECTION_TYPE_LABEL,
  type Section,
} from "@/app/admin/secciones/_components/section-form";
import {
  deleteSectionAction,
  reorderSectionsAction,
  toggleSectionActiveAction,
} from "@/app/admin/secciones/actions";
import { cn } from "@/lib/utils";

export function SectionsList({ sections }: { sections: Section[] }) {
  const [items, setItems] = useState<Section[]>(sections);
  const [lastSeen, setLastSeen] = useState(sections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  if (sections !== lastSeen) {
    setLastSeen(sections);
    setItems(sections);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    startTransition(() => {
      reorderSectionsAction(next.map((s) => s.id));
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          Sin secciones todavía. Agrega la primera abajo.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((s) =>
                editingId === s.id ? (
                  <li key={s.id}>
                    <Card>
                      <CardContent className="p-4">
                        <SectionForm
                          section={s}
                          onDone={() => setEditingId(null)}
                        />
                      </CardContent>
                    </Card>
                  </li>
                ) : (
                  <SectionRow
                    key={s.id}
                    section={s}
                    onEdit={() => setEditingId(s.id)}
                  />
                ),
              )}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {adding ? (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Nueva sección</h3>
            <SectionForm onDone={() => setAdding(false)} />
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Plus className="h-4 w-4" /> Agregar sección
        </button>
      )}
    </div>
  );
}

function SectionRow({
  section,
  onEdit,
}: {
  section: Section;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card p-3",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {section.title ?? SECTION_TYPE_LABEL[section.type]}
          </span>
          <Badge variant="muted">{SECTION_TYPE_LABEL[section.type]}</Badge>
          {section.active ? (
            <Badge variant="success">Activa</Badge>
          ) : (
            <Badge variant="muted">Oculta</Badge>
          )}
        </div>
        <ConfigSummary config={section.config} />
      </div>

      <div className="flex items-center gap-1">
        <form
          action={toggleSectionActiveAction.bind(
            null,
            section.id,
            !section.active,
          )}
        >
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="gap-1"
            aria-label={section.active ? "Ocultar" : "Mostrar"}
          >
            {section.active ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <form action={deleteSectionAction.bind(null, section.id)}>
          <button
            type="submit"
            aria-label="Eliminar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              if (!confirm("¿Eliminar esta sección?")) e.preventDefault();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </li>
  );
}

function ConfigSummary({ config }: { config: Record<string, unknown> }) {
  const entries = Object.entries(config);
  if (entries.length === 0) return null;
  return (
    <p className="mt-0.5 truncate text-xs text-muted-foreground">
      {entries
        .map(([k, v]) => `${k}=${typeof v === "string" && v.length > 40 ? v.slice(0, 40) + "…" : String(v)}`)
        .join(" · ")}
    </p>
  );
}
