import { BUILD_INFO } from "../build-info";

export function renderFooter(): string {
  return `
    <footer class="mt-14 border-t border-nordic-borderLight dark:border-nordic-borderDark pt-6 pb-4 text-[12px] text-nordic-mutedLight dark:text-nordic-mutedDark">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <!-- Brand & Dev -->
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span class="font-serif font-bold text-nordic-textLight dark:text-nordic-textDark">CnG Writer</span>
          <span class="opacity-40">·</span>
          <span>Dev: <strong class="text-nordic-textLight dark:text-nordic-textDark">CnG Soft</strong></span>
          <span class="opacity-40">·</span>
          <a href="https://cngteam.pagezapp.cc.cd/" target="_blank" rel="noopener noreferrer" 
             class="text-nordic-accentLight dark:text-nordic-accentDark hover:underline font-semibold">
            Web
          </a>
          <span class="opacity-40">·</span>
          <a href="https://bugtracker.cngpnsteam2026.cc.cd/" target="_blank" rel="noopener noreferrer" 
             class="text-rose-500 hover:underline font-semibold">
            Bugs / Feedback
          </a>
        </div>

        <!-- Build Info & Admin Gate -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-[11px] font-mono">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            ${BUILD_INFO.version} · ${BUILD_INFO.deployedAtIST}
          </span>
          <a href="#/adminpanel" class="opacity-40 hover:opacity-100 hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-opacity p-1" title="Diagnostics & Admin Panel">
            ⚙️
          </a>
        </div>
      </div>
    </footer>
  `;
}