import React, { useState, useRef, useEffect } from 'react';
import { User, CreditCard, Bell, Map, LogOut, Edit2, CheckCircle, History, Check } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, updateUser, logout } = useUser();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form if context changes
  useEffect(() => {
    if (user) {
      setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
      });
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
        updateUser({
            ...formData,
            avatarUrl
        });
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    }, 1000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
      setAvatarUrl('https://picsum.photos/seed/default/200'); 
  };
  
  const handleSignOut = () => {
      logout();
      navigate('/login');
  };

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 scrollbar-hide">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col gap-2 pb-2">
                <h1 className="text-white text-3xl font-bold font-display tracking-tight">User & System Settings</h1>
                <p className="text-text-secondary">Manage your account preferences, billing, and notification settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar Nav */}
                <aside className="lg:col-span-3 lg:sticky lg:top-8">
                    <nav className="flex flex-col gap-1 w-full bg-surface-dark rounded-xl border border-border-dark p-2 overflow-hidden">
                        {[
                            { icon: User, label: 'Profile', active: true },
                            { icon: CreditCard, label: 'Payment Methods', active: false },
                            { icon: Bell, label: 'Notifications', active: false },
                            { icon: Map, label: 'Map Preferences', active: false },
                        ].map((item, idx) => (
                            <button key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group w-full text-left ${
                                item.active ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-secondary hover:bg-bg-dark hover:text-white border-l-2 border-transparent'
                            }`}>
                                <item.icon size={20} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        ))}
                        <div className="h-px w-full bg-border-dark my-1"></div>
                        <button 
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 border-l-2 border-transparent transition-all w-full text-left"
                        >
                            <LogOut size={20} />
                            <span className="text-sm font-medium">Sign Out</span>
                        </button>
                    </nav>
                </aside>

                {/* Content */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    {/* Profile Section */}
                    <section className="bg-surface-dark rounded-xl border border-border-dark p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-1 border-b border-border-dark pb-4">
                                <h2 className="text-xl font-bold text-white">Profile Information</h2>
                                <p className="text-sm text-text-secondary">Update your photo and personal details here.</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                    <div className="size-24 rounded-full bg-cover bg-center ring-4 ring-bg-dark transition-all duration-300" style={{ backgroundImage: `url('${avatarUrl}')` }}></div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 className="text-white" size={24} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-3">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/png, image/jpeg, image/gif"
                                            onChange={handleFileChange}
                                        />
                                        <button 
                                            onClick={handleAvatarClick}
                                            className="px-4 py-2 rounded-lg bg-surface-lighter hover:bg-border-dark text-white text-sm font-medium transition-colors border border-border-dark"
                                        >
                                            Change Avatar
                                        </button>
                                        <button 
                                            onClick={handleRemoveAvatar}
                                            className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-secondary">JPG, GIF or PNG. 1MB max.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary">First Name</label>
                                    <input 
                                        type="text" 
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full bg-bg-dark border border-border-dark rounded-lg h-11 px-4 text-white text-sm focus:border-primary outline-none" 
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary">Last Name</label>
                                    <input 
                                        type="text" 
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full bg-bg-dark border border-border-dark rounded-lg h-11 px-4 text-white text-sm focus:border-primary outline-none" 
                                    />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-sm font-medium text-text-secondary">Email Address</label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-bg-dark border border-border-dark rounded-lg h-11 px-4 text-white text-sm focus:border-primary outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border-dark">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                                        saveSuccess 
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                                        : 'bg-primary hover:bg-blue-600 text-white shadow-blue-500/20'
                                    }`}
                                >
                                    {isSaving ? (
                                        <>Saving...</>
                                    ) : saveSuccess ? (
                                        <><Check size={18} /> Saved!</>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Payment Section */}
                    <section className="bg-surface-dark rounded-xl border border-border-dark p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-white">Primary Payment Method</h2>
                                <p className="text-sm text-text-secondary">Used for all charging sessions by default.</p>
                            </div>
                            <button className="text-primary text-sm font-medium hover:text-white transition-colors">Manage All</button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                             {/* Card Visualization */}
                             <div className="w-full md:w-80 aspect-[1.586] rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#172554] p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-white/10">
                                 <div className="flex justify-between items-start z-10">
                                     <span className="text-white text-lg font-bold font-mono tracking-widest">VISA</span>
                                 </div>
                                 <div className="flex justify-between items-end z-10">
                                     <div className="flex flex-col gap-1">
                                         <p className="text-white/60 text-[10px] uppercase tracking-wider">Card Holder</p>
                                         <p className="text-white text-sm font-medium tracking-wide">
                                            {formData.firstName.toUpperCase()} {formData.lastName.toUpperCase()}
                                         </p>
                                     </div>
                                     <div className="flex flex-col items-end gap-1">
                                         <p className="text-white/60 text-[10px] uppercase tracking-wider">Expires</p>
                                         <p className="text-white text-sm font-medium tracking-widest">12/25</p>
                                     </div>
                                 </div>
                                 <div className="absolute bottom-16 left-6 right-6 flex justify-between items-center z-10">
                                     <p className="text-white/90 font-mono text-lg tracking-widest flex gap-2">
                                         <span>••••</span> <span>••••</span> <span>••••</span> <span>4242</span>
                                     </p>
                                 </div>
                             </div>

                             <div className="flex-1 w-full flex flex-col gap-4">
                                <div className="p-4 rounded-lg bg-bg-dark border border-border-dark flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <CheckCircle className="text-emerald-400" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Verified Status</p>
                                            <p className="text-text-secondary text-xs">Active and ready for payments</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-bg-dark border border-border-dark flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <History className="text-primary" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Last Transaction</p>
                                            <p className="text-text-secondary text-xs">€14.50 • Station République B2</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-secondary">2 days ago</span>
                                </div>
                             </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Settings;