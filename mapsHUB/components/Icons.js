// Component to render specific icons based on type
function CategoryIcon({ type, className = "" }) {
    let iconClass = "icon-map-pin";
    
    switch(type) {
        case 'utensils': iconClass = "icon-utensils"; break;
        case 'fuel': iconClass = "icon-fuel"; break;
        case 'shopping-bag': iconClass = "icon-shopping-bag"; break;
        case 'camera': iconClass = "icon-camera"; break;
        case 'trees': iconClass = "icon-trees"; break;
        case 'graduation-cap': iconClass = "icon-graduation-cap"; break;
        case 'activity': iconClass = "icon-activity"; break;
        default: iconClass = "icon-map-pin";
    }
    
    return <div className={`${iconClass} ${className}`}></div>;
}

// Create a custom Leaflet DivIcon HTML string
function createMarkerHtml(type, color = "red-500") {
    // We map common Tailwind colors to hex for inline styles if needed, 
    // but here we use classes inside the divIcon structure.
    // Note: Leaflet divIcon innerHTML is a string, not JSX.
    
    let iconName = 'map-pin';
    if (type === 'restaurant') iconName = 'utensils';
    if (type === 'shop') iconName = 'shopping-bag';
    if (type === 'park') iconName = 'trees';
    
    // Performance optimization: Removed animate-ping and animate-pulse
    // Added static opacity for "semi-transparent" look as requested
    
    if (type === 'tour-point') {
        const isPending = color === 'yellow-400' || color === 'yellow-500';
        return `
            <div class="map-pin relative flex items-center justify-center w-6 h-6 hover:opacity-100 transition-opacity duration-200">
                <div class="absolute inset-0 ${isPending ? 'bg-yellow-400' : 'bg-blue-500'} rounded-full opacity-50 ${isPending ? 'animate-pulse' : ''}"></div>
                <div class="relative w-4 h-4 ${isPending ? 'bg-yellow-500' : 'bg-blue-600'} rounded-full shadow-sm border border-white opacity-90"></div>
            </div>
        `;
    }

    return `
        <div class="map-pin relative flex items-center justify-center w-10 h-10 hover:opacity-100 transition-opacity duration-200">
            <div class="absolute inset-0 bg-${color} rounded-full opacity-40"></div>
            <div class="relative w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-${color} opacity-95">
                <div class="icon-${iconName} text-sm text-${color}"></div>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white opacity-95"></div>
        </div>
    `;
}