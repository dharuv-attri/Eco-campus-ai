export default function PublicLoading() {
  return (
    <div className="container-eco py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-3/4" />
        <div className="skeleton mt-8 h-64 w-full" />
      </div>
    </div>
  );
}
