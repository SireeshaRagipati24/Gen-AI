import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-green-100 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ContentAI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-green-600 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-green-600 transition-colors">Pricing</a>
            <a href="#about" className="text-gray-600 hover:text-green-600 transition-colors">About</a>
            
            <Link to="/signup">
              <Button variant="outline" size="sm">Sign Up</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">Login</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-green-100">
              <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-green-600">Features</a>
              <a href="#pricing" className="block px-3 py-2 text-gray-600 hover:text-green-600">Pricing</a>
              <a href="#about" className="block px-3 py-2 text-gray-600 hover:text-green-600">About</a>
              <div className="flex flex-col space-y-2 px-3 pt-2">
                <Link to="/signup">
                  <Button variant="outline" size="sm" className="w-full">Sign Up</Button>
                </Link>
                <Link to="/login">
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">Login</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
