import Link from 'next/link';

export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumb && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 font-semibold">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {b.href ? <Link href={b.href} className="hover:text-gold-primary transition">{b.label}</Link> : <span>{b.label}</span>}
                {i < breadcrumb.length - 1 && <span className="opacity-50">/</span>}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-base text-muted-foreground mt-2 font-medium">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
