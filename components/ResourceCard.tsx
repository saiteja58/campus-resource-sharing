
import React from 'react';
import { Resource } from '../types';

const IconWrapper = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-medium text-slate-500 ${className}`}>
    {children}
  </span>
);

interface ResourceCardProps {
  resource: Resource;
  onAction: (id: string) => void;
  onClick: () => void;
  isOwner?: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onAction, onClick, isOwner }) => {
  const displayCollege = (resource.college || 'Unknown Campus').split(' ')[0];
  const displayOwner = (resource.ownerName || 'User').split(' ')[0];

  // Calculate Average Rating
  const ratings = resource.ratings ? Object.values(resource.ratings) : [];
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  const commentCount = resource.comments ? Object.keys(resource.comments).length : 0;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
    >
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <img 
          src={resource.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'} 
          alt={resource.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Load+Failed';
          }}
        />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
            resource.category === 'Books' ? 'bg-blue-600 text-white' :
            resource.category === 'Notes' ? 'bg-green-600 text-white' :
            resource.category === 'Lab Equipment' ? 'bg-purple-600 text-white' :
            'bg-slate-900 text-white'
          }`}>
            {resource.category}
          </span>
        </div>

        {/* Social Proof Overlays */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {avgRating && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black text-slate-900 shadow-sm">
              <svg className="w-3 h-3 text-amber-500 fill-amber-500" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {avgRating}
            </div>
          )}
          {commentCount > 0 && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black text-slate-900 shadow-sm">
              <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              {commentCount}
            </div>
          )}
        </div>

        {/* PDF Indicator */}
        {resource.documentUrl && (
          <div className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-xl shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          </div>
        )}
      </div>
      
      <div className="p-6 flex-grow flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-900 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">{resource.title}</h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1">
  {resource.downloadCount || 0} downloads
</p>

        </div>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
           <IconWrapper className="font-black text-[10px] uppercase tracking-widest">
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
              {displayCollege}
           </IconWrapper>
           <IconWrapper className="font-black text-[10px] uppercase tracking-widest">
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[8px] font-black mr-1">
                {displayOwner[0]}
              </div>
              {displayOwner}
           </IconWrapper>
        </div>

        <div className="mt-6">
          <button 
            onClick={(e) => { e.stopPropagation(); onAction(resource.id); }}
            disabled={resource.status === 'borrowed' && !isOwner}
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              isOwner 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                : resource.status === 'borrowed'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100'
            }`}
          >
            {isOwner ? 'Your Item' : 'Quick Inquiry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
