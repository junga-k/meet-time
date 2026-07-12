export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <span className="page-title">{title}</span>
        {subtitle && <span className="page-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
