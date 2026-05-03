import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";

export default function Banner({ zone }) {
  const [banners, setBanners] = useState([]);
  const { t } = useLang();

  useEffect(() => {
    let active = true;
    api.get(`/banners?zone=${zone}`)
      .then(({ data }) => { if (active) setBanners(data || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [zone]);

  if (!banners.length) return null;

  if (zone === "hero") {
    const b = banners[0];
    return (
      <a
        href={b.link_url || "#"}
        data-testid={`banner-${zone}`}
        className="block group relative overflow-hidden rounded-xl border border-zinc-800 hover:border-[#d4ff00] transition-colors"
      >
        <div className="aspect-[4/1] sm:aspect-[6/1] relative">
          <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6 sm:px-10">
            <div>
              <div className="badge badge-lime mb-2">{t("common.bannerAd")}</div>
              <h3 className="font-display font-black text-2xl sm:text-4xl uppercase tracking-tighter">{b.title}</h3>
            </div>
          </div>
        </div>
      </a>
    );
  }

  if (zone === "feed") {
    return (
      <div className="space-y-3">
        {banners.slice(0, 1).map((b) => (
          <a key={b.banner_id} href={b.link_url || "#"} data-testid={`banner-${zone}`}
             className="block group relative overflow-hidden rounded-xl border border-zinc-800 hover:border-[#d4ff00] transition-colors">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-zinc-950 to-black">
              <div className="badge badge-lime text-[10px]">{t("common.bannerAd")}</div>
              {b.image_url && <img src={b.image_url} alt="" className="w-16 h-12 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{b.title}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  // sidebar / footer compact
  return (
    <div className="space-y-3">
      {banners.map((b) => (
        <a
          key={b.banner_id}
          href={b.link_url || "#"}
          data-testid={`banner-${zone}`}
          className="block group relative overflow-hidden rounded-lg border border-zinc-800 hover:border-[#d4ff00] transition-colors"
        >
          <div className="aspect-[16/9] relative">
            <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <span className="badge badge-lime text-[10px] mb-1">{t("common.bannerAd")}</span>
              <div className="font-bold text-white text-sm truncate">{b.title}</div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
