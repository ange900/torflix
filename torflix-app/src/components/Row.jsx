import ContentCard from './ContentCard';

export default function Row({ title, items, type }) {
  if (!items?.length) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-3 px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map(item => (
          <ContentCard key={item.id} item={item} type={type || item.media_type} />
        ))}
      </div>
    </div>
  );
}
