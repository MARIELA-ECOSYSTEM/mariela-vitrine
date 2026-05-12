 /// <reference types="vite/client" />
 
 interface HTMLImageElement extends HTMLElement {
   fetchPriority?: "high" | "low" | "auto";
 }
 
 declare namespace React {
   interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
     fetchPriority?: "high" | "low" | "auto";
     fetchpriority?: "high" | "low" | "auto";
   }
   interface VideoHTMLAttributes<T> extends HTMLAttributes<T> {
     fetchPriority?: "high" | "low" | "auto";
     fetchpriority?: "high" | "low" | "auto";
   }
 }
