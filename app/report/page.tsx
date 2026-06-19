'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n';
import Link from 'next/link';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function SubmissionPage() {
  const { t } = useLanguage();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Roads');
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Address manual states
  const [addressText, setAddressText] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressPincode, setAddressPincode] = useState('');

  // Nominatim search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [submitStep, setSubmitStep] = useState(0); // 1 = uploading, 2 = database save, 3 = AI analyze, 4 = routing, 5 = done
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ grievance_id: string; linked?: boolean; message?: string } | null>(null);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLocation({ lat, lng });
    // Reverse geocode to auto-fill manual fields
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const text = parts.slice(0, Math.max(1, parts.length - 3)).join(',').trim();
          const postcode = data.address?.postcode || '';
          const city = data.address?.city || data.address?.town || data.address?.municipality || 'Chittorgarh';
          
          setAddressText(text || data.display_name);
          setAddressCity(city);
          setAddressPincode(postcode);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    }
  };

  // Automatically request and pin user location on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedPermission = localStorage.getItem('geolocation_permission');
    const storedLat = localStorage.getItem('user_lat');
    const storedLng = localStorage.getItem('user_lng');

    if (storedPermission === 'granted' && storedLat && storedLng) {
      const lat = parseFloat(storedLat);
      const lng = parseFloat(storedLng);
      setLocation({ lat, lng });
      handleLocationSelect(lat, lng);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          localStorage.setItem('geolocation_permission', 'granted');
          localStorage.setItem('user_lat', lat.toString());
          localStorage.setItem('user_lng', lng.toString());
          handleLocationSelect(lat, lng);
        },
        (error) => {
          console.warn('Geolocation failed or permission denied:', error);
        }
      );
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setLocation({ lat, lng });
    
    // Parse display name
    const parts = item.display_name.split(',');
    const text = parts.slice(0, Math.max(1, parts.length - 3)).join(',').trim();
    
    const postcodeMatch = item.display_name.match(/\b\d{6}\b/);
    const pincode = postcodeMatch ? postcodeMatch[0] : '';
    
    let city = 'Chittorgarh';
    const cityMatch = parts.find((p: string) => p.trim().toLowerCase() === 'chittorgarh' || p.trim().toLowerCase() === 'jaipur' || p.trim().toLowerCase().includes('city'));
    if (cityMatch) {
      city = cityMatch.trim();
    }
    
    setAddressText(text || item.display_name);
    setAddressCity(city);
    setAddressPincode(pincode);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !phone || !description || !photoBase64 || !location) {
      setError('Please fill in all fields, drop a pin on the map, and upload an evidence photo.');
      return;
    }

    setLoading(true);
    setSubmitStep(1); // Uploading photo
    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
          category,
          description,
          imageBase64: photoBase64,
          lat: location.lat,
          lng: location.lng,
          address_text: addressText,
          address_city: addressCity,
          address_pincode: addressPincode,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit complaint');
      }

      setSubmitStep(2); // Saving to DB
      await new Promise(r => setTimeout(r, 1000));
      
      setSubmitStep(3); // AI analyzing
      await new Promise(r => setTimeout(r, 2000));
      
      setSubmitStep(4); // Routing to department
      await new Promise(r => setTimeout(r, 2000));
      
      setSubmitStep(5); // Complete
      await new Promise(r => setTimeout(r, 500));
      
      setSuccessData(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
      setSubmitStep(0);
    } finally {
      setLoading(false);
    }
  };

  const renderStepper = () => {
    return (
      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-8 space-y-6">
        <div className="space-y-2 text-center border-b border-slate-100 pb-4">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-700 rounded-full animate-spin mx-auto mb-2"></div>
          <h3 className="font-extrabold text-slate-800 text-lg">Submitting your complaint...</h3>
          <p className="text-xs text-slate-400 font-semibold">This usually takes 15-30 seconds.</p>
        </div>
        
        <div className="space-y-4 text-sm font-semibold">
          {/* Step 1 */}
          <div className="flex justify-between items-center">
            <span className="text-slate-700">Step 1: 📤 Uploading evidence photo</span>
            <span className={submitStep >= 2 ? 'text-green-600 font-bold' : 'text-blue-600 font-bold animate-pulse'}>
              {submitStep >= 2 ? '✅ Done' : '⏳ In progress...'}
            </span>
          </div>
          
          {/* Step 2 */}
          <div className="flex justify-between items-center">
            <span className="text-slate-700">Step 2: 🗄️ Saving to database</span>
            <span className={submitStep >= 3 ? 'text-green-600 font-bold' : submitStep === 2 ? 'text-blue-600 font-bold animate-pulse' : 'text-slate-400'}>
              {submitStep >= 3 ? '✅ Done' : submitStep === 2 ? '⏳ In progress...' : '⏳ Waiting...'}
            </span>
          </div>
          
          {/* Step 3 */}
          <div className="flex justify-between items-center">
            <span className="text-slate-700">Step 3: 🤖 AI agents analyzing photo</span>
            <span className={submitStep >= 4 ? 'text-green-600 font-bold' : submitStep === 3 ? 'text-blue-600 font-bold animate-pulse' : 'text-slate-400'}>
              {submitStep >= 4 ? '✅ Done' : submitStep === 3 ? '⏳ In progress...' : '⏳ Waiting...'}
            </span>
          </div>
          
          {/* Step 4 */}
          <div className="flex justify-between items-center">
            <span className="text-slate-700">Step 4: 🗺️ Routing to department</span>
            <span className={submitStep >= 5 ? 'text-green-600 font-bold' : submitStep === 4 ? 'text-blue-600 font-bold animate-pulse' : 'text-slate-400'}>
              {submitStep >= 5 ? '✅ Done' : submitStep === 4 ? '⏳ In progress...' : '⏳ Waiting...'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-12 px-4 bg-slate-50">
        {renderStepper()}
      </div>
    );
  }

  if (successData && !loading) {
    const isLinked = successData.linked;
    return (
      <div className="w-full py-12 px-4">
        <div className="max-w-xl w-full mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              {isLinked ? '🔗' : '✅'}
            </div>
            <h2 className="font-extrabold text-slate-800 text-2xl">
              {isLinked ? 'Complaint Already Exists' : 'Complaint Registered Successfully'}
            </h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
              {isLinked 
                ? successData.message 
                : 'Your grievance has been captured and submitted to the multi-agent AI verification loop.'}
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block">
                Your Grievance ID
              </span>
              <span className="font-mono text-xl font-bold text-slate-700 block mt-1">
                {successData.grievance_id}
              </span>
            </div>
            
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(successData.grievance_id);
                  alert('Grievance ID copied to clipboard!');
                }}
                className="bg-white hover:bg-slate-50 text-[#041A3E] text-xs font-bold py-2.5 px-4 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                📋 Copy ID
              </button>
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/track/${successData.grievance_id}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert('Share link copied to clipboard!');
                }}
                className="bg-white hover:bg-slate-50 text-[#041A3E] text-xs font-bold py-2.5 px-4 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                🔗 Share Link
              </button>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm">What happens next:</h4>
            <ul className="space-y-2 text-xs text-slate-600 font-semibold leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">1.</span>
                <span>🤖 <strong>AI agents verify your photo</strong> (&lt; 1 min) to identify damage validity and filter spams.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">2.</span>
                <span>🗺️ <strong>Auto-routed to correct department</strong> (PWD, Jal Shakti, or DISCOM) matching the issue type.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">3.</span>
                <span>⏰ <strong>SLA deadline assigned</strong> (24-72 hours) dynamically according to issue severity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">4.</span>
                <span>📍 <strong>Resolution verified on-site</strong> by physical official telemetry checks and resolution photo comparisons.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 flex gap-4">
            <Link
              href={`/track/${successData.grievance_id}`}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-center py-3.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              Track My Complaint →
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setName('');
                setPhone('');
                setCategory('Roads');
                setDescription('');
                setPhotoBase64(null);
                setPhotoFile(null);
                setLocation(null);
                setAddressText('');
                setAddressCity('');
                setAddressPincode('');
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all cursor-pointer border border-slate-200"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Hero Banner */}
      <div className="bg-[#041A3E] text-white py-12 px-8 w-full border-b border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight">Report a Local Issue</h2>
          <p className="text-white/80 mt-2 text-sm md:text-base leading-relaxed max-w-3xl">
            Pin the exact location, describe the problem, submit your grievance. Our civic team will respond within{' '}
            <span className="text-[#F97316] font-bold">48 hours</span>.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Name and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Your Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Phone Number</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Nominatim Search Bar */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                🔍 Search Location / Landmark
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search address or landmark... e.g. Fort Chittorgarh"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-[#041A3E] hover:bg-[#0a2652] disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-100 last:border-b-0 transition-all truncate block cursor-pointer"
                    >
                      📍 {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map Location Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                📍 Pin your location on the map (Click on map to drop pin)
              </label>
              <MapPicker
                onLocationSelect={handleLocationSelect}
                heightClass="h-[400px]"
                initialLat={location?.lat}
                initialLng={location?.lng}
              />
              {location && (
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Location Selected: Lat {location.lat.toFixed(5)}, Lng {location.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* Manual Address fields */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                Manual Address (optional — for reference)
              </span>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Street / Colony / Landmark</label>
                <input
                  type="text"
                  placeholder="Colony Name, Lane Number, landmark nearby"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">City</label>
                  <input
                    type="text"
                    placeholder="Chittorgarh"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">PIN Code</label>
                  <input
                    type="text"
                    placeholder="312001"
                    value={addressPincode}
                    onChange={(e) => setAddressPincode(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Category & Description */}
            <div className="space-y-8">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="Roads">Roads (PWD)</option>
                  <option value="Water Supply">Water Supply (Jal Shakti)</option>
                  <option value="Electricity">Electricity (DISCOM)</option>
                  <option value="Others">Others (General Admin)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Describe the issue</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide a detailed description of the infrastructure damage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload with Thumbnail Preview */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">Upload Evidence Photo (required)</label>
              
              {photoBase64 && photoFile ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                    <img src={photoBase64} alt="Evidence Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{photoFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {(photoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBase64(null);
                      setPhotoFile(null);
                    }}
                    className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border border-slate-200 hover:border-red-100 cursor-pointer"
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white rounded-xl cursor-pointer transition-all">
                  <span className="text-3xl mb-1">📷</span>
                  <span className="text-sm font-bold text-slate-500">Click to upload or drag & drop</span>
                  <span className="text-[10px] text-slate-400 mt-1">Accepts images (PNG, JPG)</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Submitting Grievance...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
