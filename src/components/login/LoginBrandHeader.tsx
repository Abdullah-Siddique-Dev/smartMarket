import React from "react";
import { Store } from "lucide-react";

export const LoginBrandHeader: React.FC = () => {
  return (
    <div className="text-center space-y-2">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-600 text-white shadow-theme-md shadow-brand-500/25">
        <Store className="size-7" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        Smart Market <span className="text-brand-500">OS</span>
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        Wholesale Market Enterprise ERP & Billing Terminal
      </p>
    </div>
  );
};
