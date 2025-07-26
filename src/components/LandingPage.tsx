import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ArrowRight, Upload, GitBranch, Zap, Shield, Search, Users } from 'lucide-react'

const rotatingTexts = [
  'Instruction manual',
  'Brochure', 
  'Logo',
  'Bill of Materials',
  '3D CAD',
  'Merch design'
]

export default function LandingPage() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-semibold text-black">Verto</span>
          </div>
          <Button 
            onClick={() => blink.auth.login()}
            className="bg-black text-white hover:bg-gray-800"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
            Do you have the latest{' '}
            <span className="relative">
              <span 
                key={currentTextIndex}
                className="inline-block text-gray-600 animate-pulse"
              >
                {rotatingTexts[currentTextIndex]}
              </span>
              <span className="text-black">?</span>
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Stop hunting for the right file version. Verto uses AI to automatically find and replace your files, 
            keeping your team synchronized with the latest versions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => blink.auth.login()}
              size="lg"
              className="bg-black text-white hover:bg-gray-800 px-8 py-4 text-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              File management that actually works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for teams who need to stay in sync without the complexity
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Smart Upload */}
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black">Smart Upload</h3>
              </div>
              <p className="text-lg text-gray-600 mb-6">
                Don't waste time hunting for the right file to replace. Just drag and drop your new file, 
                and our AI instantly identifies which existing file it should update. No manual searching, 
                no confusion—just effortless file management.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  AI-powered file matching by name, content, and context
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  Automatic replacement suggestions with confidence scores
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  Save hours of manual file organization
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Upload className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-600">Uploading: Product_Manual_v3.pdf</span>
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-black rounded-full"></div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">🤖 AI Suggestion</p>
                  <p className="text-sm text-blue-700">
                    Found similar file: "Product_Manual_v2.pdf"<br />
                    <span className="font-medium">Replace with new version?</span>
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Replace</Button>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">Keep Both</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mt-20">
            {/* Advanced Versioning */}
            <div className="md:order-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4">
                  <GitBranch className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black">Advanced Versioning</h3>
              </div>
              <p className="text-lg text-gray-600 mb-6">
                Set your organization's naming convention once, and Verto automatically applies it to every file. 
                Version numbers are embedded directly into documents and kept constantly updated across your entire team.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  Custom naming conventions (v2.0.1, POL-003 Rev B, etc.)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  Automatic version embedding in document metadata
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  Real-time synchronization across all team members
                </li>
              </ul>
            </div>
            <div className="md:order-1 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Organization Policy</p>
                  <p className="text-sm text-gray-600 font-mono">Format: POL-{'{'}XXX{'}'} Rev {'{'}A-Z{'}'}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm font-medium text-green-900">Safety_Manual.pdf</p>
                      <p className="text-xs text-green-700">POL-001 Rev C</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Safety_Manual.pdf</p>
                      <p className="text-xs text-gray-500">POL-001 Rev B</p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Previous</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Safety_Manual.pdf</p>
                      <p className="text-xs text-gray-500">POL-001 Rev A</p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Archive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Everything you need, nothing you don't
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-4">Secure Sharing</h3>
                <p className="text-gray-600">
                  Share files internally with granular permissions or externally with password-protected links that expire when you want them to.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-4">Powerful Search</h3>
                <p className="text-gray-600">
                  Find any file instantly with full-text search across PDFs and documents, plus smart filtering by date, author, and version.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-4">Team Management</h3>
                <p className="text-gray-600">
                  Organize your team with role-based access control. Admins, members, and viewers each get exactly the permissions they need.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to stop chasing file versions?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join teams who've eliminated version confusion forever
          </p>
          <Button 
            onClick={() => blink.auth.login()}
            size="lg"
            className="bg-white text-black hover:bg-gray-100 px-8 py-4 text-lg"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-semibold text-black">Verto</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 Verto. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}