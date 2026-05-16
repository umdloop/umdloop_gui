import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "UMDLoop GUI",
  description: "GUI to interact with UMDLoop systems",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div id="custom-cursor" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const cursor = document.getElementById('custom-cursor');
                if (!cursor) return;
                let mouseX = -100, mouseY = -100;
                document.addEventListener('mousemove', function(e) {
                  mouseX = e.clientX;
                  mouseY = e.clientY;
                  cursor.style.left = mouseX + 'px';
                  cursor.style.top = mouseY + 'px';
                  cursor.style.opacity = '1';
                });
                document.addEventListener('mouseleave', function() {
                  cursor.style.opacity = '0';
                });
                document.addEventListener('mousedown', function() {
                  cursor.style.width = '14px';
                  cursor.style.height = '14px';
                  cursor.style.background = 'rgba(255,255,255,1)';
                });
                document.addEventListener('mouseup', function() {
                  cursor.style.width = '20px';
                  cursor.style.height = '20px';
                  cursor.style.background = 'rgba(255,255,255,0.85)';
                });
                cursor.style.opacity = '0';
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
