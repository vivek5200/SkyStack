export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 text-gray-400 text-center py-4 mt-8">
      <p>
        © {new Date().getFullYear()} <span className="text-blue-400 font-medium">SkyStack</span> — 
        Cloud-Based Processing and Streaming of INSAT Satellite Data using COGs
      </p>
    </footer>
  );
}
