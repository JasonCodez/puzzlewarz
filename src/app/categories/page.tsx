"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  puzzleCount: number;
}

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchCategories();
    }
  }, [status, router]);

  async function fetchCategories() {
    try {
      const response = await fetch("/api/puzzle-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: '#020202' }}>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p style={{ color: '#FDE74C' }} className="text-lg">Loading categories...</p>
        </div>
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: '#020202' }} className="min-h-screen">
      {/* Header */}
      <div className="pt-24 pb-16 px-4" style={{ backgroundImage: 'linear-gradient(135deg, rgba(56, 145, 166, 0.1) 0%, rgba(253, 231, 76, 0.05) 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-4">Puzzle Categories</h1>
          <p style={{ color: '#DDDBF1' }}>Explore our collection of puzzles organized by category. Choose a category to get started!</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-12 max-w-7xl mx-auto">
        {categories.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: '#DDDBF1' }} className="text-lg">No categories available yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/puzzles?category=${category.id}`}
                className="group rounded-lg border overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl flex flex-col"
                style={{
                  backgroundColor: 'rgba(56, 145, 166, 0.08)',
                  borderColor: category.color || '#3891A6',
                  borderWidth: '2px',
                }}
              >
                {/* Icon Header */}
                <div
                  className="h-24 flex items-center justify-center text-6xl transition-all group-hover:scale-110"
                  style={{
                    backgroundColor: `${category.color || '#3891A6'}20`,
                  }}
                >
                  {category.icon || '🎯'}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                  {category.description && (
                    <p style={{ color: '#DDDBF1' }} className="text-sm mb-4 flex-1">
                      {category.description}
                    </p>
                  )}

                  {/* Puzzle Count */}
                  <div className="pt-4" style={{ borderTopColor: 'rgba(56, 145, 166, 0.2)', borderTopWidth: '1px' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ color: '#AB9F9D' }} className="text-sm font-medium">
                        {category.puzzleCount} puzzle{category.puzzleCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ color: '#3891A6' }} className="text-lg font-bold">
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Coming Soon cards */}
            {[
              { icon: '🚪', name: 'Escape Rooms', description: 'Multi-stage collaborative rooms with inventory puzzles, hidden clues, and timed challenges.', color: '#7C3AED' },
              { icon: '🕵️', name: 'Detective Cases', description: 'Noir-style mystery investigations. Gather evidence, follow leads — one wrong accusation and you\'re locked out.', color: '#EF4444' },
              { icon: '🌐', name: 'ARG Puzzles', description: 'Alternate Reality Games that span ciphers, image analysis, audio decoding, and multi-step trails.', color: '#3891A6' },
            ].map((cs) => (
              <div
                key={cs.name}
                className="rounded-lg border overflow-hidden flex flex-col relative"
                style={{
                  backgroundColor: `${cs.color}08`,
                  borderColor: `${cs.color}40`,
                  borderWidth: '2px',
                  opacity: 0.85,
                }}
              >
                {/* Coming Soon badge */}
                <div
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: cs.color,
                    backgroundColor: `${cs.color}14`,
                    border: `1px solid ${cs.color}30`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cs.color, boxShadow: `0 0 6px ${cs.color}` }} />
                  Coming Soon
                </div>

                {/* Icon Header */}
                <div
                  className="h-24 flex items-center justify-center text-6xl relative"
                  style={{ backgroundColor: `${cs.color}12` }}
                >
                  <span style={{ opacity: 0.7 }}>{cs.icon}</span>
                  {/* Lock overlay */}
                  <span className="absolute text-2xl" style={{ opacity: 0.3 }}>🔒</span>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{cs.name}</h3>
                  <p style={{ color: '#DDDBF1' }} className="text-sm mb-4 flex-1">{cs.description}</p>

                  <div className="pt-4" style={{ borderTopColor: `${cs.color}20`, borderTopWidth: '1px' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ color: cs.color }} className="text-sm font-semibold">
                        Launching soon
                      </span>
                      <span style={{ color: cs.color, opacity: 0.5 }} className="text-lg font-bold">
                        ⏳
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
