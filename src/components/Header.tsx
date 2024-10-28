import React from 'react';

const Header = () => {
    return (
        <header className="w-full bg-white-100 shadow-md p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between"> {/* Main container, flexbox layout */}
                <img src="./Storyfairy.png" alt="Logo" className=" items-left w-0 h-0 md:h-0 md:w-16 lg:h-20 lg:w-20 m-0" /> {/* Responsive logo with no margin */}
                <div className="flex flex-col items-left"> {/* Contains h1 and p tag */}
                    <h1 className="text-3xl font-bold text-blue-600">StoryFairy</h1>
                    <p className="text-gray-600 text-sm">Where Imagination Takes Flight</p>
                </div>
            </div>
        </header>
    );
};

export default Header;
