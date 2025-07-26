export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-black">Verto</h1>
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  )
}