import React from 'react';

export const AboutPage: React.FC = () => {
    const features = [
        {
            title: 'Create Magical Bedtime Stories',
            description: 'StoryFairy harnesses advanced artificial intelligence to craft personalized children\'s stories. with AI at your fingertips, generate unique narratives tailored to your specific preferences, ensuring each story is a one-of-a-kind adventure.',
            imageSrc: './image1.png',
            imageAlt: 'AI Story Creation',
            imagePosition: 'right'
        },
        {
            title: 'Dynamic Illustrations',
            description: 'Every story comes to life with custom-generated illustrations that perfectly complement the narrative. Our AI-powered image generation creates unique, vibrant visuals that capture the imagination of young readers, making each story a visual masterpiece.',
            imageSrc: '/image2.png',
            imageAlt: 'Story Illustrations',
            imagePosition: 'left'
        },
        {
            title: 'Learning Experience',
            description: 'Beyond entertainment, StoryFairy offers multiple story styles, lengths, and educational themes to support cognitive and emotional growth of your child through storytelling.',
            imageSrc: '/image3.png',
            imageAlt: 'Personalized Learning',
            imagePosition: 'right'
        },
        {
            title: 'StoryBook Generation',
            description: 'Download the stories you generated as one-of-a-kind custom children story books',
            imageSrc: '/image4.png',
            imageAlt: 'Personalized Learning',
            imagePosition: 'left'
        },
        {
            title: 'Personalized Stories',
            description: 'Make your child the lead character of their own story. Simply upload a photo of your child and the generated story and images will have your child as the lead character. Download the custom story book with your child as the lead character and watch them ask you to read it every day!',
            imageSrc: '/image5.png',
            imageAlt: 'Personalized Learning',
            imagePosition: 'right'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-20">
            <div className="max-w-4xl mx-auto px-4">
                <header className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-blue-900 mb-4">
                        Discover StoryFairy
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Transforming storytelling through cutting-edge artificial intelligence, creating personalized magical experiences for children.
                    </p>
                </header>

                {features.map((feature, index) => (
                    <div 
                        key={feature.title} 
                        className={`
                            flex flex-col md:flex-row items-center 
                            mb-16 bg-white shadow-lg rounded-xl overflow-hidden
                            ${feature.imagePosition === 'left' 
                                ? 'md:flex-row-reverse' 
                                : 'md:flex-row'}
                        `}
                    >
                        <div className="md:w-7/12 p-8">
                            <h2 className="text-3xl font-semibold text-blue-800 mb-4">
                                {feature.title}
                            </h2>
                            <p className="text-gray-700 text-lg leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                        <div className="md:w-5/12">
                            <img 
                                src={feature.imageSrc} 
                                alt={feature.imageAlt}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                ))}

                <section className="bg-blue-50 rounded-xl p-8 text-center">
                    <h3 className="text-2xl font-bold text-blue-900 mb-4">
                        Key Features at a Glance
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            'AI-Powered Story Generation',
                            'Custom Scene Illustrations',
                            'Text-to-Speech Narration',
                            'Multiple Story Styles',
                            'PDF Export',
                            'Story Management'
                        ].map(feature => (
                            <div 
                                key={feature} 
                                className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-all"
                            >
                                <span className="text-blue-600 font-semibold">
                                    {feature}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};