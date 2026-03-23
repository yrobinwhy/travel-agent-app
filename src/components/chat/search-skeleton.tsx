"use client";

import { cn } from "@/lib/utils";
import { Plane, Hotel } from "lucide-react";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("bg-muted/60 rounded animate-pulse", className)} />;
}

export function FlightSearchSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center gap-2">
          <Plane className="w-4 h-4 text-emerald-500 animate-pulse" />
          <SkeletonBar className="h-4 w-32" />
          <div className="ml-auto">
            <SkeletonBar className="h-4 w-20" />
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <SkeletonBar className="w-5 h-5 rounded-full" />
              <SkeletonBar className="w-6 h-6 rounded" />
              <div className="w-20">
                <SkeletonBar className="h-3 w-16 mb-1" />
                <SkeletonBar className="h-2.5 w-12" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <SkeletonBar className="h-4 w-10" />
                <div className="flex-1 h-px bg-muted/40" />
                <SkeletonBar className="h-4 w-10" />
              </div>
              <SkeletonBar className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HotelSearchSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-purple-500/10 flex items-center gap-2">
          <Hotel className="w-4 h-4 text-purple-500 animate-pulse" />
          <SkeletonBar className="h-4 w-32" />
          <div className="ml-auto">
            <SkeletonBar className="h-4 w-20" />
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <SkeletonBar className="w-5 h-5 rounded-full" />
              <SkeletonBar className="w-14 h-14 rounded-lg" />
              <div className="flex-1">
                <SkeletonBar className="h-3.5 w-40 mb-1.5" />
                <SkeletonBar className="h-2.5 w-24 mb-1" />
                <SkeletonBar className="h-2.5 w-32" />
              </div>
              <div className="text-right">
                <SkeletonBar className="h-4 w-16 mb-1" />
                <SkeletonBar className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
