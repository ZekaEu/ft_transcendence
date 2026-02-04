import React from 'react'

function ShopPage() {
    return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Triple Trouble Shop</h1>
            <p className="text-slate-500">Coming Soon: Customize your avatar and buy power-ups!</p>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-50 grayscale">
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">face</span>
                    <h3 className="text-xl font-bold">Premium Avatars</h3>
                </div>
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">bolt</span>
                    <h3 className="text-xl font-bold">Power-ups</h3>
                </div>
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">palette</span>
                    <h3 className="text-xl font-bold">UI Themes</h3>
                </div>
            </div>
        </div>
    )
}

export default ShopPage
