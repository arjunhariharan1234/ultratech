import { Truck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-ft-yellow rounded-lg flex items-center justify-center">
            <Truck className="w-7 h-7 text-ft-black" />
          </div>
          <h1 className="text-3xl font-bold text-ft-gray-900">
            Ultratech Diversion Dashboard
          </h1>
        </div>
        <p className="text-ft-gray-500 mb-6">
          Real-time logistics diversion tracking and freight impact analysis
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark text-ft-black font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
