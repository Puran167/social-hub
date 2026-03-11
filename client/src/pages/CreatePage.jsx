import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiMusicalNote, HiSparkles, HiBuildingStorefront, HiUsers,
  HiAcademicCap, HiPhoto, HiArrowLeft
} from 'react-icons/hi2';
import API from '../services/api';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const categories = [
  { value: 'Music', icon: HiMusicalNote, color: 'from-pink-500 to-violet-500', desc: 'Bands, artists, DJs' },
  { value: 'Creator', icon: HiSparkles, color: 'from-amber-500 to-orange-500', desc: 'Content creators, influencers' },
  { value: 'Brand', icon: HiBuildingStorefront, color: 'from-blue-500 to-cyan-500', desc: 'Businesses, products' },
  { value: 'Community', icon: HiUsers, color: 'from-green-500 to-emerald-500', desc: 'Groups, clubs, forums' },
  { value: 'Education', icon: HiAcademicCap, color: 'from-indigo-500 to-purple-500', desc: 'Courses, tutorials, learning' },
];

const CreatePage = () => {
  const navigate = useNavigate();
  const [pageName, setPageName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pageName.trim() || !category) return toast.error('Page name and category are required');
    setCreating(true);
    try {
      const form = new FormData();
      form.append('pageName', pageName);
      form.append('category', category);
      form.append('description', description);
      if (profilePhoto) form.append('profilePhoto', profilePhoto);
      if (coverPhoto) form.append('coverPhoto', coverPhoto);
      const { data } = await API.post('/pages/create', form);
      toast.success('Page created!');
      navigate(`/pages/${data._id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create page'); }
    setCreating(false);
  };

  const selectedCat = categories.find(c => c.value === category);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pages')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create Page</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Set up your page in minutes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover photo */}
        <div className="card overflow-hidden !p-0">
          <div className={`h-40 bg-gradient-to-r ${selectedCat?.color || 'from-gray-400 to-gray-500'} relative`}>
            {coverPhoto && (
              <img src={URL.createObjectURL(coverPhoto)} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <label className="cursor-pointer bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/30 transition-all flex items-center gap-2">
                <HiPhoto className="w-4 h-4" /> {coverPhoto ? 'Change Cover' : 'Add Cover Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={e => setCoverPhoto(e.target.files[0])} />
              </label>
            </div>
          </div>
          {/* Profile photo */}
          <div className="px-5 pb-5 -mt-10 relative z-10">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-dark-card shadow-lg overflow-hidden bg-white dark:bg-dark-elevated">
              {profilePhoto ? (
                <img src={URL.createObjectURL(profilePhoto)} alt="" className="w-full h-full object-cover" />
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                  <HiPhoto className="w-6 h-6 text-gray-400" />
                  <span className="text-[9px] text-gray-400 mt-0.5">Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setProfilePhoto(e.target.files[0])} />
                </label>
              )}
            </div>
            {profilePhoto && (
              <label className="cursor-pointer text-xs text-primary font-medium mt-1 inline-block">
                Change <input type="file" accept="image/*" className="hidden" onChange={e => setProfilePhoto(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>

        {/* Page Name */}
        <div className="card space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Page Name *</label>
            <input type="text" value={pageName} onChange={e => setPageName(e.target.value)}
              className="input-field w-full" placeholder="e.g. Coding World" required maxLength={100} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(cat => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${category === cat.value
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2`}>
                    <cat.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold">{cat.value}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Bio / Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input-field w-full" placeholder="Tell people about your page..." rows={3} maxLength={500} />
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit" disabled={creating || !pageName.trim() || !category}
          className="btn-primary w-full disabled:opacity-50 text-base py-3">
          {creating ? 'Creating...' : 'Create Page'}
        </motion.button>
      </form>
    </div>
  );
};

export default CreatePage;
